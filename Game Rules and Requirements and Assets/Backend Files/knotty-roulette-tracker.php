<?php
/*
Plugin Name: Knotty Roulette Tracker
Description: Backend to manage Knotty Roulette challenges and track like/dislike counts. Admin UI, sort/search, bulk tools, CSV import/export. Public REST for challenges, voting, and anonymous player tracking.
Version: 3.0.0
Author: Knotty Times
*/

if (!defined('ABSPATH')) { exit; }

/* ==========================================================================
 * Activation + schema (create/upgrade)
 * ========================================================================== */
register_activation_hook(__FILE__, 'krt_activate_plugin');
function krt_activate_plugin() {
    krt_run_db_migrations();
}

add_action('admin_init', 'krt_run_db_migrations'); // ensure upgrades apply without re-activating
function krt_run_db_migrations() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $tbl_challenges = $wpdb->prefix . 'knotty_roulette_challenges';
    $tbl_responses  = $wpdb->prefix . 'knotty_roulette_responses';
    $tbl_players    = $wpdb->prefix . 'knotty_roulette_players';

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    // Challenges (unchanged)
    dbDelta("CREATE TABLE {$tbl_challenges} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        challenge_text TEXT NOT NULL,
        has_bonus TINYINT(1) NOT NULL DEFAULT 0,
        card_pack VARCHAR(255) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_card_pack (card_pack)
    ) {$charset};");

    // Responses (votes) – add anon_id + unique key for dedupe
    dbDelta("CREATE TABLE {$tbl_responses} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        challenge_id BIGINT(20) UNSIGNED NOT NULL,
        vote_type ENUM('like','dislike') NOT NULL,
        anon_id VARCHAR(64) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_challenge_id (challenge_id),
        UNIQUE KEY uniq_vote_pair (challenge_id, anon_id)
    ) {$charset};");

    // Players (anonymous user tracker)
    dbDelta("CREATE TABLE {$tbl_players} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        anon_id VARCHAR(64) NOT NULL,
        plays INT UNSIGNED NOT NULL DEFAULT 0,
        first_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_player (anon_id)
    ) {$charset};");

    if (get_option('krt_default_pack') === false) {
        add_option('krt_default_pack', 'Original Pack');
    }
}

/* ==========================================================================
 * Front-end script (unchanged): expose ajax_url, nonce, default_pack
 * ========================================================================== */
add_action('wp_enqueue_scripts', 'krt_enqueue_scripts');
function krt_enqueue_scripts() {
    wp_enqueue_script(
        'krt-ajax',
        plugin_dir_url(__FILE__) . 'krt-ajax.js',
        array('jquery'),
        gmdate('YmdHis'),
        true
    );

    $default_pack = get_option('krt_default_pack', 'Original Pack');
    if (isset($_GET['deck']) && $_GET['deck'] !== '') {
        $default_pack = sanitize_text_field(wp_unslash($_GET['deck']));
    }

    wp_localize_script('krt-ajax', 'krt_ajax', array(
        'ajax_url'     => admin_url('admin-ajax.php'),
        'nonce'        => wp_create_nonce('krt_nonce'),
        'default_pack' => $default_pack,
    ));
}

/* ==========================================================================
 * Admin menu (single page)
 * ========================================================================== */
add_action('admin_menu', 'krt_add_admin_menu');
function krt_add_admin_menu() {
    add_menu_page(
        'Knotty Roulette',
        'Knotty Roulette',
        'manage_options',
        'knotty-roulette',
        'krt_render_manage_challenges_page',
        'dashicons-randomize',
        26
    );
}
add_action('admin_menu', function () {
    remove_submenu_page('knotty-roulette', 'knotty-roulette');
}, 999);

/* ==========================================================================
 * Helpers
 * ========================================================================== */
function krt_boolish_to_int($v) {
    if (is_bool($v)) return $v ? 1 : 0;
    $v = strtolower(trim((string)$v));
    return in_array($v, array('1','true','yes','y','on'), true) ? 1 : 0;
}
function krt_admin_url($args = array()) {
    $base = admin_url('admin.php?page=knotty-roulette');
    if (!empty($args)) $base = add_query_arg($args, $base);
    return $base;
}

/* ==========================================================================
 * Admin page (UI) – unchanged except for prior improvements
 * ========================================================================== */
function krt_render_manage_challenges_page() {
    if (!current_user_can('manage_options')) { return; }
    global $wpdb;
    $tbl_challenges = $wpdb->prefix . 'knotty_roulette_challenges';
    $tbl_responses  = $wpdb->prefix . 'knotty_roulette_responses';
    $tbl_players    = $wpdb->prefix . 'knotty_roulette_players';

    /* ---------- POST actions ---------- */
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['krt_action'])) {
        $action = sanitize_text_field($_POST['krt_action']);

        if ($action === 'add' && check_admin_referer('krt_challenge_nonce', 'krt_challenge_nonce_field')) {
            $challenge_text = isset($_POST['challenge_text']) ? wp_kses_post($_POST['challenge_text']) : '';
            $card_pack      = isset($_POST['card_pack']) ? sanitize_text_field($_POST['card_pack']) : '';
            $has_bonus      = !empty($_POST['has_bonus']) ? 1 : 0;
            if ($challenge_text !== '' && $card_pack !== '') {
                $wpdb->insert($tbl_challenges, array(
                    'challenge_text' => $challenge_text,
                    'card_pack'      => $card_pack,
                    'has_bonus'      => $has_bonus
                ), array('%s','%s','%d'));
                echo '<div class="updated"><p>Challenge added.</p></div>';
                unset($_GET['edit']);
            } else {
                echo '<div class="error"><p>Challenge Text and Card Pack are required.</p></div>';
            }
        }

        if ($action === 'edit' && check_admin_referer('krt_challenge_nonce', 'krt_challenge_nonce_field')) {
            $id             = isset($_POST['id']) ? intval($_POST['id']) : 0;
            $challenge_text = isset($_POST['challenge_text']) ? wp_kses_post($_POST['challenge_text']) : '';
            $card_pack      = isset($_POST['card_pack']) ? sanitize_text_field($_POST['card_pack']) : '';
            $has_bonus      = !empty($_POST['has_bonus']) ? 1 : 0;
            if ($id > 0 && $challenge_text !== '' && $card_pack !== '') {
                $wpdb->update($tbl_challenges, array(
                    'challenge_text' => $challenge_text,
                    'card_pack'      => $card_pack,
                    'has_bonus'      => $has_bonus
                ), array('id' => $id), array('%s','%s','%d'), array('%d'));
                echo '<div class="updated"><p>Challenge updated.</p></div>';
                unset($_GET['edit']);
            } else {
                echo '<div class="error"><p>Invalid edit request.</p></div>';
            }
        }

        if ($action === 'delete' && check_admin_referer('krt_challenge_nonce', 'krt_challenge_nonce_field')) {
            $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
            if ($id > 0) {
                $wpdb->delete($tbl_challenges, array('id' => $id), array('%d'));
                $wpdb->delete($tbl_responses, array('challenge_id' => $id), array('%d'));
                echo '<div class="updated"><p>Challenge deleted.</p></div>';
            } else {
                echo '<div class="error"><p>Invalid delete request.</p></div>';
            }
        }

        if ($action === 'bulk_assign' && check_admin_referer('krt_bulk_nonce', 'krt_bulk_nonce_field')) {
            $ids_str   = isset($_POST['ids']) ? sanitize_text_field($_POST['ids']) : '';
            $card_pack = isset($_POST['card_pack']) ? sanitize_text_field($_POST['card_pack']) : '';
            $ids = array_filter(array_map('intval', explode(',', $ids_str)));
            if (!empty($ids) && $card_pack !== '') {
                $placeholders = implode(',', array_fill(0, count($ids), '%d'));
                $sql = "UPDATE {$tbl_challenges} SET card_pack=%s WHERE id IN ($placeholders)";
                $params = array_merge(array($card_pack), $ids);
                $wpdb->query($wpdb->prepare($sql, $params));
                echo '<div class="updated"><p>Packs assigned.</p></div>';
            } else {
                echo '<div class="error"><p>Provide IDs and a pack name.</p></div>';
            }
        }

        if ($action === 'clear_counters' && check_admin_referer('krt_clear_nonce', 'krt_clear_nonce_field')) {
            $wpdb->query("TRUNCATE TABLE {$tbl_responses}");
            echo '<div class="updated"><p>All like/dislike counters have been reset.</p></div>';
        }

        if ($action === 'save_default_pack' && check_admin_referer('krt_default_nonce', 'krt_default_nonce_field')) {
            $default_pack = isset($_POST['krt_default_pack']) ? sanitize_text_field($_POST['krt_default_pack']) : 'Original Pack';
            update_option('krt_default_pack', $default_pack);
            echo '<div class="updated"><p>Default deck saved.</p></div>';
        }
    }

    /* ---------- Editing state ---------- */
    $editing = null;
    if (isset($_GET['edit'])) {
        $edit_id = absint($_GET['edit']);
        if ($edit_id) {
            $editing = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$tbl_challenges} WHERE id=%d", $edit_id), ARRAY_A);
        }
    }

    /* ---------- Filters (GET) ---------- */
    $search   = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '';
    $sort     = isset($_GET['sort']) ? sanitize_text_field($_GET['sort']) : 'newest'; // newest | likes | dislikes
    $per_page = 50;
    $paged    = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
    $offset   = ($paged - 1) * $per_page;

    /* ---------- Base WHERE ---------- */
    global $wpdb;
    $tbl_challenges = $wpdb->prefix . 'knotty_roulette_challenges';
    $tbl_responses  = $wpdb->prefix . 'knotty_roulette_responses';
    $where = array(); $params = array();
    if ($search !== '') {
        $like = '%' . $wpdb->esc_like($search) . '%';
        $where[] = "(c.challenge_text LIKE %s OR c.card_pack LIKE %s)";
        $params[] = $like; $params[] = $like;
    }

    /* ---------- Total count (no join) ---------- */
    $sql_count = "SELECT COUNT(*) FROM {$tbl_challenges} c";
    if ($where) $sql_count .= " WHERE " . implode(' AND ', $where);
    $total_rows = $params ? intval($wpdb->get_var($wpdb->prepare($sql_count, $params))) : intval($wpdb->get_var($sql_count));
    $total_pages = max(1, ceil($total_rows / $per_page));

    /* ---------- Main list with counters ---------- */
    $sql = "
        SELECT 
            c.id, c.challenge_text, c.card_pack, c.has_bonus, c.created_at,
            COALESCE(SUM(CASE WHEN r.vote_type='like' THEN 1 ELSE 0 END),0) AS likes,
            COALESCE(SUM(CASE WHEN r.vote_type='dislike' THEN 1 ELSE 0 END),0) AS dislikes
        FROM {$tbl_challenges} c
        LEFT JOIN {$tbl_responses} r ON r.challenge_id = c.id
    ";
    if ($where) { $sql .= " WHERE " . implode(' AND ', $where); }
    $sql .= " GROUP BY c.id ";

    switch ($sort) {
        case 'likes':     $sql .= " ORDER BY likes DESC, c.id DESC "; break;
        case 'dislikes':  $sql .= " ORDER BY dislikes DESC, c.id DESC "; break;
        default:          $sql .= " ORDER BY c.created_at DESC "; break;
    }
    $sql_display = $sql . $wpdb->prepare(" LIMIT %d OFFSET %d ", $per_page, $offset);
    $rows = $params ? $wpdb->get_results($wpdb->prepare($sql_display, $params), ARRAY_A)
                    : $wpdb->get_results($sql_display, ARRAY_A);

    $default_pack = get_option('krt_default_pack', 'Original Pack');
    $page_url     = admin_url('admin.php?page=knotty-roulette');

    /* ---------- Quick stats ---------- */
    $total_challenges = intval($wpdb->get_var("SELECT COUNT(*) FROM {$tbl_challenges}"));
    $total_likes      = intval($wpdb->get_var("SELECT COUNT(*) FROM {$tbl_responses} WHERE vote_type='like'"));
    $total_dislikes   = intval($wpdb->get_var("SELECT COUNT(*) FROM {$tbl_responses} WHERE vote_type='dislike'"));

    ?>
    <div class="wrap">
        <div class="krt-header">
            <h1>Knotty Roulette — Game Manager</h1>
        </div>

        <div class="krt-topgrid">
            <div class="krt-col-left">
                <?php if ($editing): ?>
                <div class="krt-card">
                    <h2 class="krt-card-title">Edit Challenge #<?php echo esc_html($editing['id']); ?></h2>
                    <form method="post">
                        <?php wp_nonce_field('krt_challenge_nonce', 'krt_challenge_nonce_field'); ?>
                        <input type="hidden" name="krt_action" value="edit" />
                        <input type="hidden" name="id" value="<?php echo esc_attr($editing['id']); ?>" />
                        <table class="form-table">
                            <tr>
                                <th><label for="challenge_text_edit">Challenge Text</label></th>
                                <td><textarea id="challenge_text_edit" name="challenge_text" rows="3" class="large-text" required><?php echo esc_textarea($editing['challenge_text']); ?></textarea></td>
                            </tr>
                            <tr>
                                <th><label for="card_pack_edit">Card Pack</label></th>
                                <td><input id="card_pack_edit" name="card_pack" type="text" class="regular-text" value="<?php echo esc_attr($editing['card_pack']); ?>" required /></td>
                            </tr>
                            <tr>
                                <th><label for="has_bonus_edit">Bonus?</label></th>
                                <td>
                                    <label>
                                        <input type="checkbox" id="has_bonus_edit" name="has_bonus" value="1" class="krt-bonus-toggle" <?php checked(intval($editing['has_bonus']) === 1); ?> />
                                        This is a bonus challenge
                                    </label>
                                    <p class="description krt-bonus-hint" style="display:none;margin-top:8px;">
                                        <strong>Reminder:</strong> add <em>– Bonus if…</em> at the end of your challenge text.
                                    </p>
                                </td>
                            </tr>
                        </table>
                        <p class="submit">
                            <button class="button button-primary">Save Changes</button>
                            <a class="button" href="<?php echo esc_url($page_url); ?>">Cancel</a>
                        </p>
                    </form>
                </div>
                <?php else: ?>
                <div class="krt-card krt-card--add">
                    <h2 class="krt-card-title">Add New Challenge</h2>
                    <form method="post">
                        <?php wp_nonce_field('krt_challenge_nonce', 'krt_challenge_nonce_field'); ?>
                        <input type="hidden" name="krt_action" value="add" />
                        <table class="form-table">
                            <tr>
                                <th><label for="challenge_text">Challenge Text</label></th>
                                <td><textarea id="challenge_text" name="challenge_text" rows="3" class="large-text" required></textarea></td>
                            </tr>
                            <tr>
                                <th><label for="card_pack">Card Pack</label></th>
                                <td><input id="card_pack" name="card_pack" type="text" class="regular-text" placeholder="Original Pack" required /></td>
                            </tr>
                            <tr>
                                <th><label for="has_bonus">Bonus?</label></th>
                                <td>
                                    <label>
                                        <input type="checkbox" id="has_bonus" name="has_bonus" value="1" class="krt-bonus-toggle" />
                                        This is a bonus challenge
                                    </label>
                                    <p class="description krt-bonus-hint" style="display:none;margin-top:8px;">
                                        <strong>Reminder:</strong> add <em>– Bonus if…</em> at the end of your challenge text.
                                    </p>
                                </td>
                            </tr>
                        </table>
                        <p class="submit"><button type="submit" class="button button-primary">Add Challenge</button></p>

                        <img class="krt-card-art" src="https://www.knottytimes.com/wp-content/uploads/2025/08/Knotty-Roullette-Plugin-Grafic.png" alt="Knotty Roulette" />
                    </form>
                </div>
                <?php endif; ?>

                <div class="krt-two-up">
                    <div class="krt-card">
                        <h2 class="krt-card-title"><span class="dashicons dashicons-forms"></span> Bulk Assign Pack</h2>
                        <form method="post">
                            <?php wp_nonce_field('krt_bulk_nonce', 'krt_bulk_nonce_field'); ?>
                            <input type="hidden" name="krt_action" value="bulk_assign" />
                            <table class="form-table">
                                <tr>
                                    <th><label>Challenge IDs</label></th>
                                    <td><input type="text" name="ids" class="regular-text" placeholder="e.g. 1,2,3" /></td>
                                </tr>
                                <tr>
                                    <th><label>Card Pack</label></th>
                                    <td><input type="text" name="card_pack" class="regular-text" placeholder="Original Pack" /></td>
                                </tr>
                            </table>
                            <p class="submit"><button class="button button-primary">Assign Pack</button></p>
                        </form>
                    </div>

                    <div class="krt-card">
                        <h2 class="krt-card-title"><span class="dashicons dashicons-admin-generic"></span> Default Deck (Front End)</h2>
                        <form method="post">
                            <?php wp_nonce_field('krt_default_nonce', 'krt_default_nonce_field'); ?>
                            <input type="hidden" name="krt_action" value="save_default_pack" />
                            <input type="text" name="krt_default_pack" class="regular-text" value="<?php echo esc_attr($default_pack); ?>" />
                            <button class="button button-primary">Save Default</button>
                            <p class="description">Front end loads this deck by default. Override via <code>?deck=Your%20Deck</code> on the game URL.</p>
                        </form>
                    </div>
                </div>

                <div class="krt-card">
                    <div class="krt-stats">
                        <span class="krt-chip"><span class="dashicons dashicons-portfolio"></span> <?php echo number_format_i18n($total_challenges); ?> Challenges</span>
                        <span class="krt-chip krt-like"><span class="dashicons dashicons-thumbs-up"></span> <?php echo number_format_i18n($total_likes); ?> Likes</span>
                        <span class="krt-chip krt-dislike"><span class="dashicons dashicons-thumbs-down"></span> <?php echo number_format_i18n($total_dislikes); ?> Dislikes</span>
                    </div>
                    <form method="get" class="krt-toolbar" style="margin-top:8px;">
                        <input type="hidden" name="page" value="knotty-roulette" />
                        <label for="krt-sort">Sort:</label>
                        <select name="sort" id="krt-sort">
                            <option value="newest"   <?php selected($sort, 'newest'); ?>>Newest</option>
                            <option value="likes"    <?php selected($sort, 'likes'); ?>>Most Likes</option>
                            <option value="dislikes" <?php selected($sort, 'dislikes'); ?>>Most Dislikes</option>
                        </select>
                        <label for="krt-search">Search:</label>
                        <input type="search" name="s" id="krt-search" value="<?php echo esc_attr($search); ?>" placeholder="Text or pack" />
                        <button class="button button-primary">Apply</button>
                        <a class="button" href="<?php echo esc_url($page_url); ?>">Clear</a>
                    </form>
                </div>
            </div>

            <div class="krt-col-right">
                <div class="krt-card">
                    <h2 class="krt-card-title"><span class="dashicons dashicons-download"></span> Export CSV</h2>
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                        <?php wp_nonce_field('krt_export_nonce', 'krt_export_nonce_field'); ?>
                        <input type="hidden" name="action" value="krt_export" />
                        <input type="hidden" name="s" value="<?php echo esc_attr($search); ?>" />
                        <input type="hidden" name="sort" value="<?php echo esc_attr($sort); ?>" />
                        <p style="margin-bottom:8px;"><label><input type="radio" name="scope" value="view" checked /> Export <strong>Current View</strong> (respects search & sort)</label></p>
                        <p><label><input type="radio" name="scope" value="all" /> Export <strong>All Challenges</strong></label></p>
                        <p class="submit"><button class="button button-primary">Export CSV</button></p>
                        <p class="description">Columns: id, challenge_text, has_bonus, card_pack, created_at, likes, dislikes</p>
                    </form>
                </div>

                <div class="krt-card">
                    <h2 class="krt-card-title"><span class="dashicons dashicons-upload"></span> Import CSV</h2>
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" enctype="multipart/form-data">
                        <?php wp_nonce_field('krt_import_nonce', 'krt_import_nonce_field'); ?>
                        <input type="hidden" name="action" value="krt_import" />
                        <p><label>CSV File: <input type="file" name="csv_file" accept=".csv" required></label></p>
                        <p>
                            <label>Mode:</label><br>
                            <label><input type="radio" name="mode" value="upsert" checked> Upsert by ID</label><br>
                            <label><input type="radio" name="mode" value="append"> Append (ignore IDs)</label>
                        </p>
                        <p>
                            <label><input type="checkbox" name="dry_run" value="1" checked> Dry run (preview only)</label><br>
                            <label><input type="checkbox" name="seed_votes" value="1"> Seed like/dislike counters from CSV (advanced)</label><br>
                            <label style="margin-left:24px;"><input type="checkbox" name="seed_reset" value="1"> Clear existing votes for affected rows first</label>
                        </p>
                        <p class="submit"><button class="button button-primary">Run Import</button></p>
                        <p class="description">CSV columns: id, challenge_text, has_bonus (0/1), card_pack, created_at (YYYY-MM-DD HH:MM:SS), likes, dislikes.</p>
                    </form>
                </div>
            </div>
        </div>

        <form method="post" class="krt-inline">
            <?php wp_nonce_field('krt_clear_nonce', 'krt_clear_nonce_field'); ?>
            <input type="hidden" name="krt_action" value="clear_counters" />
            <button class="button" onclick="return confirm('Reset ALL like/dislike counters?')">Reset Like / Dislike Counter</button>
        </form>

        <div class="krt-table-wrap">
            <table class="widefat fixed striped krt-table">
                <thead>
                    <tr>
                        <th class="col-id">ID</th>
                        <th>Challenge</th>
                        <th class="col-bonus">Bonus</th>
                        <th class="col-pack">Pack</th>
                        <th class="col-like">Like</th>
                        <th class="col-dislike">Dislike</th>
                        <th class="col-created">Created</th>
                        <th class="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($rows)): foreach ($rows as $c): ?>
                    <tr>
                        <td><?php echo esc_html($c['id']); ?></td>
                        <td><?php echo esc_html($c['challenge_text']); ?></td>
                        <td><?php echo intval($c['has_bonus']) ? '<span class="krt-badge krt-badge-bonus">Bonus</span>' : '—'; ?></td>
                        <td><span class="krt-badge krt-badge-pack"><?php echo esc_html($c['card_pack']); ?></span></td>
                        <td><span class="krt-badge krt-badge-like"><?php echo intval($c['likes']); ?></span></td>
                        <td><span class="krt-badge krt-badge-dislike"><?php echo intval($c['dislikes']); ?></span></td>
                        <td><?php echo esc_html($c['created_at']); ?></td>
                        <td class="krt-actions">
                            <a class="button" href="<?php echo esc_url( add_query_arg(array('page'=>'knotty-roulette','edit'=>$c['id']), admin_url('admin.php')) ); ?>">
                                <span class="dashicons dashicons-edit"></span> Edit
                            </a>
                            <form method="post" style="display:inline-block; margin-left:6px;">
                                <?php wp_nonce_field('krt_challenge_nonce', 'krt_challenge_nonce_field'); ?>
                                <input type="hidden" name="krt_action" value="delete" />
                                <input type="hidden" name="id" value="<?php echo esc_attr($c['id']); ?>" />
                                <button class="button button-secondary" onclick="return confirm('Delete this challenge?')">
                                    <span class="dashicons dashicons-trash"></span> Delete
                                </button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; else: ?>
                    <tr><td colspan="8">No challenges found.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <div class="krt-pagination">
            <?php
            $base_args = array('page'=>'knotty-roulette','s'=>$search,'sort'=>$sort);
            $prev_link = $paged > 1 ? krt_admin_url(array_merge($base_args, array('paged'=>$paged-1))) : '';
            $next_link = $paged < $total_pages ? krt_admin_url(array_merge($base_args, array('paged'=>$paged+1))) : '';

            $pages_to_show = array();
            $pages_to_show[] = 1;
            for ($i = $paged - 2; $i <= $paged + 2; $i++) {
                if ($i > 1 && $i < $total_pages) $pages_to_show[] = $i;
            }
            if ($total_pages > 1) $pages_to_show[] = $total_pages;
            $pages_to_show = array_values(array_unique($pages_to_show));
            sort($pages_to_show);
            ?>
            <span>Page <?php echo $paged; ?> of <?php echo $total_pages; ?></span>
            <div class="krt-pager-btns">
                <?php if ($prev_link): ?>
                    <a class="button" href="<?php echo esc_url($prev_link); ?>">&laquo; Prev</a>
                <?php endif; ?>

                <?php
                $last_printed = 0;
                foreach ($pages_to_show as $p) {
                    if ($last_printed && $p > $last_printed + 1) {
                        echo '<span class="krt-ellipsis">…</span>';
                    }
                    if ($p == $paged) {
                        echo '<span class="button button-primary krt-page-current">'.$p.'</span>';
                    } else {
                        $plink = krt_admin_url(array_merge($base_args, array('paged'=>$p)));
                        echo '<a class="button" href="'.esc_url($plink).'">'.$p.'</a>';
                    }
                    $last_printed = $p;
                }
                ?>

                <?php if ($next_link): ?>
                    <a class="button" href="<?php echo esc_url($next_link); ?>">Next &raquo;</a>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <style>
    .krt-header { display:flex; align-items:center; justify-content:center; margin-bottom:10px; text-align:center; }
    .krt-header h1 { margin: 10px 0 6px; }

    .krt-stats { display:flex; gap:8px; margin:6px 0 10px; flex-wrap:wrap; }
    .krt-chip { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; background:#f3f4f5; border-radius:999px; }
    .krt-like { background:#e7f7ee; }
    .krt-dislike { background:#fdeaea; }
    .krt-toolbar { display:flex; flex-wrap:wrap; gap:8px 10px; align-items:center; margin:0; }
    .krt-toolbar input[type="search"] { min-width:220px; }

    .krt-topgrid { display:grid; grid-template-columns:1fr 360px; gap:14px; margin:10px 0 12px; }
    @media (max-width: 1100px){ .krt-topgrid{ grid-template-columns:1fr; } .krt-col-right{ order: -1; } }

    .krt-two-up { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:12px 0; }
    @media (max-width: 900px){ .krt-two-up{ grid-template-columns:1fr; } }

    .krt-card { background:#fff; border:1px solid #dcdcde; border-radius:8px; padding:10px 12px; position:relative; }
    .krt-card + .krt-card { margin-top:12px; }
    .krt-card-title { margin:6px 0 10px; display:flex; align-items:center; gap:8px; font-size:16px; }
    .krt-inline { margin:8px 0 10px; }

    .krt-card--add .krt-card-art {
        position:absolute; right:10px; bottom:10px; width:156px; height:auto; border:none !important; background:transparent !important; box-shadow:none !important; pointer-events:none; opacity:1;
    }

    .krt-table-wrap { overflow:auto; border:1px solid #dcdcde; border-radius:8px; }
    .krt-table thead th { position:sticky; top:0; background:#f6f7f7; z-index:1; }
    .krt-table .col-id { width:60px; }
    .krt-table .col-bonus { width:90px; }
    .krt-table .col-pack { width:160px; }
    .krt-table .col-like, .krt-table .col-dislike { width:100px; text-align:left; }
    .krt-table .col-created { width:180px; }
    .krt-table .col-actions { width:200px; }
    .krt-actions .dashicons { vertical-align:middle; }

    .krt-badge { display:inline-block; padding:2px 8px; border-radius:999px; font-weight:600; font-size:12px; }
    .krt-badge-bonus { background:#fff6cc; border:1px solid #f0d45e; }
    .krt-badge-pack { background:#eef3ff; border:1px solid #cfdcff; }
    .krt-badge-like { background:#e7f7ee; border:1px solid #bfe6cf; }
    .krt-badge-dislike { background:#fdeaea; border:1px solid #f3c1c1; }

    .krt-pagination { display:flex; justify-content:space-between; align-items:center; padding:10px 0; gap:10px; flex-wrap:wrap; }
    .krt-pager-btns .button { margin-left:6px; }
    .krt-page-current { cursor:default; }
    .krt-ellipsis { margin: 0 6px; opacity:0.6; }
    </style>

    <script>
    (function(){
        function toggleHint(chk, hint){ if(chk && hint){ hint.style.display = chk.checked ? 'block' : 'none'; } }
        document.querySelectorAll('form').forEach(function(f){
            var chk = f.querySelector('.krt-bonus-toggle');
            var hint = f.querySelector('.krt-bonus-hint');
            if (chk && hint) {
                toggleHint(chk, hint);
                chk.addEventListener('change', function(){ toggleHint(chk, hint); });
            }
        });
    })();
    </script>
    <?php
}

/* ==========================================================================
 * EXPORT (admin-post)
 * ========================================================================== */
add_action('admin_post_krt_export', 'krt_handle_export');
function krt_handle_export() {
    if (!current_user_can('manage_options')) wp_die('Forbidden');
    if (!isset($_POST['krt_export_nonce_field']) || !wp_verify_nonce($_POST['krt_export_nonce_field'], 'krt_export_nonce')) {
        wp_die('Invalid nonce');
    }

    global $wpdb;
    $tbl_challenges = $wpdb->prefix . 'knotty_roulette_challenges';
    $tbl_responses  = $wpdb->prefix . 'knotty_roulette_responses';

    $scope  = isset($_POST['scope']) ? sanitize_text_field($_POST['scope']) : 'view';
    $search = isset($_POST['s']) ? sanitize_text_field($_POST['s']) : '';
    $sort   = isset($_POST['sort']) ? sanitize_text_field($_POST['sort']) : 'newest';

    $where = array(); $params = array();
    if ($search !== '') {
        $like = '%' . $wpdb->esc_like($search) . '%';
        $where[] = "(c.challenge_text LIKE %s OR c.card_pack LIKE %s)";
        $params[] = $like; $params[] = $like;
    }

    $sql = "
        SELECT 
            c.id, c.challenge_text, c.card_pack, c.has_bonus, c.created_at,
            COALESCE(SUM(CASE WHEN r.vote_type='like' THEN 1 ELSE 0 END),0) AS likes,
            COALESCE(SUM(CASE WHEN r.vote_type='dislike' THEN 1 ELSE 0 END),0) AS dislikes
        FROM {$tbl_challenges} c
        LEFT JOIN {$tbl_responses} r ON r.challenge_id = c.id
    ";
    if ($where) $sql .= " WHERE " . implode(' AND ', $where);
    $sql .= " GROUP BY c.id ";

    switch ($sort) {
        case 'likes':     $sql .= " ORDER BY likes DESC, c.id DESC "; break;
        case 'dislikes':  $sql .= " ORDER BY dislikes DESC, c.id DESC "; break;
        default:          $sql .= " ORDER BY c.created_at DESC "; break;
    }

    if ($scope !== 'all') { $sql .= " LIMIT 500 "; }

    $rows = $params ? $wpdb->get_results($wpdb->prepare($sql, $params), ARRAY_A)
                    : $wpdb->get_results($sql, ARRAY_A);

    $filename = 'knotty_challenges_' . date('Ymd_His') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=' . $filename);
    header('Pragma: no-cache');
    header('Expires: 0');

    $out = fopen('php://output', 'w');
    fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF)); // Excel BOM

    fputcsv($out, array('id','challenge_text','has_bonus','card_pack','created_at','likes','dislikes'));
    if ($rows) {
        foreach ($rows as $r) {
            fputcsv($out, array(
                $r['id'],
                $r['challenge_text'],
                intval($r['has_bonus']) ? 1 : 0,
                $r['card_pack'],
                $r['created_at'],
                intval($r['likes']),
                intval($r['dislikes']),
            ));
        }
    }
    fclose($out);
    exit;
}

/* ==========================================================================
 * IMPORT (admin-post)
 * ========================================================================== */
add_action('admin_post_krt_import', 'krt_handle_import');
function krt_handle_import() {
    if (!current_user_can('manage_options')) wp_die('Forbidden');
    if (!isset($_POST['krt_import_nonce_field']) || !wp_verify_nonce($_POST['krt_import_nonce_field'], 'krt_import_nonce')) {
        wp_die('Invalid nonce');
    }

    if (empty($_FILES['csv_file']['tmp_name'])) {
        wp_redirect(add_query_arg(array('page'=>'knotty-roulette','krt_msg'=>'no_file'), admin_url('admin.php'))); exit;
    }

    $mode        = isset($_POST['mode']) ? sanitize_text_field($_POST['mode']) : 'upsert';
    $dry_run     = !empty($_POST['dry_run']);
    $seed_votes  = !empty($_POST['seed_votes']);
    $seed_reset  = !empty($_POST['seed_reset']);

    global $wpdb;
    $tbl_challenges = $wpdb->prefix . 'knotty_roulette_challenges';
    $tbl_responses  = $wpdb->prefix . 'knotty_roulette_responses';

    $fh = fopen($_FILES['csv_file']['tmp_name'], 'r');
    if (!$fh) {
        wp_redirect(add_query_arg(array('page'=>'knotty-roulette','krt_msg'=>'file_open_error'), admin_url('admin.php'))); exit;
    }

    $header = fgetcsv($fh);
    if (!$header) {
        fclose($fh);
        wp_redirect(add_query_arg(array('page'=>'knotty-roulette','krt_msg'=>'bad_header'), admin_url('admin.php'))); exit;
    }

    $map = array();
    foreach ($header as $i => $name) {
        $norm = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '_', $name)));
        $map[$norm] = $i;
    }
    $col = function($row, $key) use ($map) {
        if (!isset($map[$key])) return '';
        $val = isset($row[$map[$key]]) ? $row[$map[$key]] : '';
        return is_string($val) ? trim($val) : $val;
    };

    $ins=$upd=$skipped=$seeded=0; $errors=array(); $line=1;

    while (($row = fgetcsv($fh)) !== false) {
        $line++;
        $id            = trim($col($row, 'id'));
        $text          = $col($row, 'challenge_text'); if ($text==='') $text = $col($row, 'challenge');
        $pack          = $col($row, 'card_pack');
        $has_bonus_in  = $col($row, 'has_bonus');
        $has_bonus     = krt_boolish_to_int($has_bonus_in);
        $created       = $col($row, 'created_at');
        $likes_csv     = intval($col($row, 'likes'));
        $dislikes_csv  = intval($col($row, 'dislikes'));

        if ($text==='' || $pack==='') { $skipped++; $errors[]="Line {$line}: missing challenge_text or card_pack"; continue; }

        $existing = null; $will_update = false;
        if ($mode === 'upsert' && ctype_digit($id) && intval($id) > 0) {
            $existing = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$tbl_challenges} WHERE id=%d", intval($id)), ARRAY_A);
            $will_update = (bool)$existing;
        }

        if ($dry_run) {
            if ($will_update) $upd++; else $ins++;
            if ($seed_votes) $seeded += ($likes_csv + $dislikes_csv);
            continue;
        }

        if ($will_update) {
            $wpdb->update($tbl_challenges, array(
                'challenge_text' => $text,
                'card_pack'      => $pack,
                'has_bonus'      => $has_bonus
            ), array('id' => intval($id)), array('%s','%s','%d'), array('%d'));
            $upd++; $challenge_id = intval($id);
        } else {
            $data = array(
                'challenge_text' => $text,
                'card_pack'      => $pack,
                'has_bonus'      => $has_bonus
            ); $fmt = array('%s','%s','%d');
            if ($created !== '') {
                $ts = strtotime($created);
                if ($ts !== false) { $data['created_at'] = date('Y-m-d H:i:s', $ts); $fmt[] = '%s'; }
            }
            $ok = $wpdb->insert($tbl_challenges, $data, $fmt);
            if ($ok === false) { $skipped++; $errors[]="Line {$line}: DB insert failed"; continue; }
            $ins++; $challenge_id = intval($wpdb->insert_id);
        }

        if ($seed_votes) {
            if ($seed_reset) $wpdb->delete($tbl_responses, array('challenge_id' => $challenge_id), array('%d'));
            $current = $wpdb->get_row($wpdb->prepare("
                SELECT 
                    COALESCE(SUM(CASE WHEN vote_type='like' THEN 1 ELSE 0 END),0) AS likes,
                    COALESCE(SUM(CASE WHEN vote_type='dislike' THEN 1 ELSE 0 END),0) AS dislikes
                FROM {$tbl_responses} WHERE challenge_id=%d
            ", $challenge_id), ARRAY_A);
            $need_like    = max(0, $likes_csv - intval($current['likes']));
            $need_dislike = max(0, $dislikes_csv - intval($current['dislikes']));
            for ($i=0; $i<$need_like; $i++) {
                $wpdb->insert($tbl_responses, array('challenge_id'=>$challenge_id, 'vote_type'=>'like'), array('%d','%s'));
            }
            for ($i=0; $i<$need_dislike; $i++) {
                $wpdb->insert($tbl_responses, array('challenge_id'=>$challenge_id, 'vote_type'=>'dislike'), array('%d','%s'));
            }
            $seeded += ($need_like + $need_dislike);
        }
    }
    fclose($fh);

    $msg = array();
    if ($dry_run) $msg[]='Dry run only.';
    $msg[]="Inserted: {$ins}";
    $msg[]="Updated: {$upd}";
    if ($skipped) $msg[]="Skipped: {$skipped}";
    if ($seed_votes) $msg[]="Votes seeded: {$seeded}";

    if (!empty($errors)) {
        $key = 'krt_import_errors_' . get_current_user_id();
        set_transient($key, $errors, 5 * MINUTE_IN_SECONDS);
        wp_redirect(add_query_arg(array(
            'page'=>'knotty-roulette',
            'krt_msg'=>rawurlencode(implode(' | ', $msg)),
            'krt_errkey'=>$key
        ), admin_url('admin.php'))); exit;
    } else {
        wp_redirect(add_query_arg(array('page'=>'knotty-roulette','krt_msg'=>rawurlencode(implode(' | ', $msg))), admin_url('admin.php'))); exit;
    }
}

/* Import notices */
add_action('admin_notices', function(){
    if (!is_admin() || !isset($_GET['page']) || $_GET['page']!=='knotty-roulette') return;
    if (isset($_GET['krt_msg'])) echo '<div class="updated"><p>' . esc_html($_GET['krt_msg']) . '</p></div>';
    if (isset($_GET['krt_errkey'])) {
        $errs = get_transient(sanitize_text_field($_GET['krt_errkey']));
        if ($errs && is_array($errs)) {
            echo '<div class="error"><p><strong>Import errors:</strong></p><ul style="margin-left:18px;">';
            foreach ($errs as $e) echo '<li>' . esc_html($e) . '</li>';
            echo '</ul></div>';
            delete_transient(sanitize_text_field($_GET['krt_errkey']));
        }
    }
});

/* ==========================================================================
 * Public REST API (challenges, vote, track-play)
 * ========================================================================== */
add_action('rest_api_init', 'krt_register_rest_routes');
function krt_register_rest_routes() {
    register_rest_route('krt/v1', '/challenges', array(
        'methods'  => 'GET',
        'callback' => 'krt_rest_get_challenges',
        'permission_callback' => '__return_true',
        'args' => array(
            'deck' => array('required' => false, 'sanitize_callback' => 'sanitize_text_field'),
            'card_pack' => array('required' => false, 'sanitize_callback' => 'sanitize_text_field'),
        ),
    ));

    register_rest_route('krt/v1', '/vote', array(
        'methods'  => 'POST',
        'callback' => 'krt_rest_vote',
        'permission_callback' => '__return_true',
        'args' => array(
            'challenge_id' => array('required' => true, 'validate_callback' => function($v){ return intval($v) > 0; }),
            'vote'         => array('required' => true, 'sanitize_callback' => 'sanitize_text_field'),
            'anon_id'      => array('required' => true, 'sanitize_callback' => 'sanitize_text_field'),
        ),
    ));

    register_rest_route('krt/v1', '/track-play', array(
        'methods'  => 'POST',
        'callback' => 'krt_rest_track_play',
        'permission_callback' => '__return_true',
        'args' => array(
            'anon_id' => array('required' => true, 'sanitize_callback' => 'sanitize_text_field'),
        ),
    ));
}

// Simple CORS for our namespace
add_filter('rest_pre_serve_request', function($served, $result, $request, $server){
    $route = $request->get_route();
    if (strpos($route, '/krt/v1/') === 0) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }
    return $served;
}, 11, 4);

// GET /krt/v1/challenges
function krt_rest_get_challenges(WP_REST_Request $request) {
    global $wpdb;
    $tbl_challenges = $wpdb->prefix . 'knotty_roulette_challenges';

    $deck = $request->get_param('deck');
    if (!$deck) $deck = $request->get_param('card_pack');

    $cache_key = 'krt_rest_challs_' . md5($deck !== null ? $deck : '*');
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        return rest_ensure_response($cached);
    }

    $sql = "SELECT id, challenge_text, card_pack, CAST(has_bonus AS UNSIGNED) AS has_bonus FROM {$tbl_challenges}";
    $params = array();
    if ($deck !== null && $deck !== '') { $sql .= " WHERE card_pack = %s"; $params[] = $deck; }

    $rows = $params ? $wpdb->get_results($wpdb->prepare($sql, $params), ARRAY_A)
                    : $wpdb->get_results($sql, ARRAY_A);

    if (!is_array($rows) || empty($rows)) {
        return new WP_REST_Response(array('success'=>false, 'message'=>'No challenges found'), 404);
    }
    foreach ($rows as &$r) { $r['has_bonus'] = intval($r['has_bonus']) === 1 ? 1 : 0; }

    // short cache (60s)
    set_transient($cache_key, $rows, 60);
    return rest_ensure_response($rows);
}

// POST /krt/v1/vote
function krt_rest_vote(WP_REST_Request $request) {
    global $wpdb;
    $tbl_challenges = $wpdb->prefix . 'knotty_roulette_challenges';
    $tbl_responses  = $wpdb->prefix . 'knotty_roulette_responses';

    $challenge_id = absint($request->get_param('challenge_id'));
    $vote_in      = strtolower(trim((string)$request->get_param('vote')));
    $anon_id      = substr(sanitize_text_field($request->get_param('anon_id')), 0, 64);

    if ($challenge_id <= 0 || $anon_id === '') {
        return new WP_REST_Response(array('success'=>false,'message'=>'Invalid parameters'), 400);
    }

    $vote_type = ($vote_in === 'upvote' || $vote_in === 'like') ? 'like' : (($vote_in === 'downvote' || $vote_in === 'dislike') ? 'dislike' : '');
    if ($vote_type === '') {
        return new WP_REST_Response(array('success'=>false,'message'=>'vote must be like|dislike'), 400);
    }

    $exists = intval($wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$tbl_challenges} WHERE id=%d", $challenge_id)));
    if (!$exists) {
        return new WP_REST_Response(array('success'=>false,'message'=>'Challenge not found'), 404);
    }

    // Dedup: one vote per (challenge_id, anon_id)
    $sql = $wpdb->prepare("
        INSERT INTO {$tbl_responses} (challenge_id, vote_type, anon_id)
        VALUES (%d, %s, %s)
        ON DUPLICATE KEY UPDATE vote_type = vote_type
    ", $challenge_id, $vote_type, $anon_id);

    $ok = $wpdb->query($sql);
    $already = ($ok === 0); // duplicate key -> no row affected

    // Return fresh counts
    $counts = $wpdb->get_row($wpdb->prepare("
        SELECT 
            COALESCE(SUM(CASE WHEN vote_type='like' THEN 1 ELSE 0 END),0) AS likes,
            COALESCE(SUM(CASE WHEN vote_type='dislike' THEN 1 ELSE 0 END),0) AS dislikes
        FROM {$tbl_responses} WHERE challenge_id=%d
    ", $challenge_id), ARRAY_A);

    return rest_ensure_response(array(
        'success'       => true,
        'already_voted' => (bool)$already,
        'challenge_id'  => $challenge_id,
        'likes'         => intval($counts['likes']),
        'dislikes'      => intval($counts['dislikes']),
    ));
}

// POST /krt/v1/track-play
function krt_rest_track_play(WP_REST_Request $request) {
    global $wpdb;
    $tbl_players = $wpdb->prefix . 'knotty_roulette_players';

    $anon_id = substr(sanitize_text_field($request->get_param('anon_id')), 0, 64);
    if ($anon_id === '') {
        return new WP_REST_Response(array('success'=>false,'message'=>'anon_id required'), 400);
    }

    // upsert play
    $sql = $wpdb->prepare("
        INSERT INTO {$tbl_players} (anon_id, plays, first_seen, last_seen)
        VALUES (%s, 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE plays = plays + 1, last_seen = NOW()
    ", $anon_id);
    $wpdb->query($sql);

    $totals = $wpdb->get_row("
        SELECT COUNT(*) AS unique_players, COALESCE(SUM(plays),0) AS total_plays
        FROM {$tbl_players}
    ", ARRAY_A);

    return rest_ensure_response(array(
        'success'         => true,
        'anon_id'         => $anon_id,
        'unique_players'  => intval($totals['unique_players']),
        'total_plays'     => intval($totals['total_plays']),
    ));
}

/* ==========================================================================
 * Existing front-end AJAX (unchanged; uses nonce on the website)
 * ========================================================================== */
add_action('wp_ajax_nopriv_krt_fetch_challenges', 'krt_fetch_challenges');
add_action('wp_ajax_krt_fetch_challenges', 'krt_fetch_challenges');
function krt_fetch_challenges() {
    $nonce = isset($_REQUEST['nonce']) ? $_REQUEST['nonce'] : (isset($_REQUEST['_ajax_nonce']) ? $_REQUEST['_ajax_nonce'] : '');
    if (!wp_verify_nonce($nonce, 'krt_nonce')) { wp_send_json_error('Invalid nonce', 403); }

    global $wpdb;
    $tbl_challenges = $wpdb->prefix . 'knotty_roulette_challenges';

    $card_pack = isset($_REQUEST['card_pack']) ? sanitize_text_field(wp_unslash($_REQUEST['card_pack'])) : '';
    $sql = "SELECT id, challenge_text, card_pack, CAST(has_bonus AS UNSIGNED) AS has_bonus FROM {$tbl_challenges}";
    $params = array();
    if ($card_pack !== '') { $sql .= " WHERE card_pack = %s"; $params[] = $card_pack; }
    $rows = $params ? $wpdb->get_results($wpdb->prepare($sql, $params)) : $wpdb->get_results($sql);

    if (!is_array($rows) || empty($rows)) { wp_send_json_error('No challenges found'); }
    foreach ($rows as &$r) { $r->has_bonus = (intval($r->has_bonus) === 1) ? 1 : 0; }
    wp_send_json_success($rows);
}

add_action('wp_ajax_nopriv_krt_vote', 'krt_vote');
add_action('wp_ajax_krt_vote', 'krt_vote');
function krt_vote() {
    $nonce = isset($_REQUEST['nonce']) ? $_REQUEST['nonce'] : (isset($_REQUEST['_ajax_nonce']) ? $_REQUEST['_ajax_nonce'] : '');
    if (!wp_verify_nonce($nonce, 'krt_nonce')) { wp_send_json_error('Invalid nonce', 403); }

    $challenge_id = isset($_REQUEST['challenge_id']) ? intval($_REQUEST['challenge_id']) : 0;
    $vote_type    = isset($_REQUEST['vote_type']) ? sanitize_text_field(wp_unslash($_REQUEST['vote_type'])) : '';

    if ($vote_type === 'upvote') $vote_type = 'like';
    if ($vote_type === 'downvote') $vote_type = 'dislike';
    if ($challenge_id <= 0 || !in_array($vote_type, array('like','dislike'), true)) {
        wp_send_json_error('Invalid request', 400);
    }

    global $wpdb;
    $tbl_responses = $wpdb->prefix . 'knotty_roulette_responses';

    $ok = $wpdb->insert($tbl_responses, array('challenge_id'=>$challenge_id, 'vote_type'=>$vote_type), array('%d','%s'));
    if ($ok) wp_send_json_success(true);
    else wp_send_json_error('Failed to record vote');
}
