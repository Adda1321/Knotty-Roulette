<?php
/*
Plugin Name: Knotty Roulette Tracker
Description: Simple backend to manage Knotty Roulette challenges and track like/dislike counts. Works with the front-end game.
Version: 2.6
Author: Knotty Times
*/

if (!defined('ABSPATH')) { exit; }

/* ==========================================================================
 * Activation: create tables if not exist
 * ========================================================================== */
register_activation_hook(__FILE__, 'krt_activate_plugin');
function krt_activate_plugin() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $tbl_challenges = $wpdb->prefix . 'knotty_roulette_challenges';
    $tbl_responses  = $wpdb->prefix . 'knotty_roulette_responses';

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    // Challenges
    dbDelta("CREATE TABLE {$tbl_challenges} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        challenge_text TEXT NOT NULL,
        has_bonus TINYINT(1) NOT NULL DEFAULT 0,
        card_pack VARCHAR(255) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_card_pack (card_pack)
    ) {$charset};");

    // Responses (votes)
    dbDelta("CREATE TABLE {$tbl_responses} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        challenge_id BIGINT(20) UNSIGNED NOT NULL,
        vote_type ENUM('like','dislike') NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_challenge_id (challenge_id)
    ) {$charset};");

    // Ensure default pack option exists
    if (get_option('krt_default_pack') === false) {
        add_option('krt_default_pack', 'Original Pack');
    }
}

/* ==========================================================================
 * Enqueue (Front-end): expose ajax_url, nonce, default_pack (+ ?deck override)
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

    // Default pack from option (fallback), allow QA override via ?deck=
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
 * Admin menu: single simple page "Knotty Roulette" (no dead submenu)
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
    // Hide the duplicate first submenu item WP auto-adds
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

function krt_current_admin_page_url($args = array()) {
    $base = admin_url('admin.php?page=knotty-roulette');
    if (!empty($args)) $base = add_query_arg($args, $base);
    return $base;
}

/* ==========================================================================
 * Admin page: Manage Challenges (search, sort, import/export, counters)
 * ========================================================================== */
function krt_render_manage_challenges_page() {
    if (!current_user_can('manage_options')) { return; }
    global $wpdb;
    $tbl_challenges = $wpdb->prefix . 'knotty_roulette_challenges';
    $tbl_responses  = $wpdb->prefix . 'knotty_roulette_responses';

    // Handle POST actions (server-side)
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
                // also clear votes for this challenge (keeps counters accurate)
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

    // Are we editing a specific challenge?
    $editing = null;
    if (isset($_GET['edit'])) {
        $edit_id = absint($_GET['edit']);
        if ($edit_id) {
            $editing = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$tbl_challenges} WHERE id=%d", $edit_id), ARRAY_A);
        }
    }

    // Search & Sort (GET)
    $search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '';
    $sort   = isset($_GET['sort']) ? sanitize_text_field($_GET['sort']) : 'newest'; // newest | likes | dislikes

    // Build query
    $where = array();
    $params = array();
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
    if ($where) { $sql .= " WHERE " . implode(' AND ', $where); }
    $sql .= " GROUP BY c.id ";

    switch ($sort) {
        case 'likes':
            $sql .= " ORDER BY likes DESC, c.id DESC ";
            break;
        case 'dislikes':
            $sql .= " ORDER BY dislikes DESC, c.id DESC ";
            break;
        case 'newest':
        default:
            $sql .= " ORDER BY c.created_at DESC ";
            break;
    }

    // Limit for admin table display (export can override)
    $sql_display = $sql . " LIMIT 500 ";

    $rows = $params ? $wpdb->get_results($wpdb->prepare($sql_display, $params), ARRAY_A)
                    : $wpdb->get_results($sql_display, ARRAY_A);

    $default_pack = get_option('krt_default_pack', 'Original Pack');
    $edit_url_base = admin_url('admin.php?page=knotty-roulette');
    $page_url      = admin_url('admin.php?page=knotty-roulette');
    ?>
    <div class="wrap">
        <h1>Knotty Roulette — Manage Challenges</h1>

        <!-- Filters: Sort + Search -->
        <form method="get" style="margin: 0 0 16px;">
            <input type="hidden" name="page" value="knotty-roulette" />
            <label for="krt-sort">Sort by:</label>
            <select name="sort" id="krt-sort">
                <option value="newest"   <?php selected($sort, 'newest'); ?>>Newest</option>
                <option value="likes"    <?php selected($sort, 'likes'); ?>>Most Likes</option>
                <option value="dislikes" <?php selected($sort, 'dislikes'); ?>>Most Dislikes</option>
            </select>
            &nbsp;&nbsp;
            <label for="krt-search">Search (text or pack):</label>
            <input type="search" name="s" id="krt-search" value="<?php echo esc_attr($search); ?>" class="regular-text" />
            <button class="button">Apply</button>
            <a class="button" href="<?php echo esc_url($page_url); ?>">Clear</a>
        </form>

        <!-- Tools / Settings -->
        <h2>Default Deck (Front End)</h2>
        <form method="post" style="margin-bottom:20px;">
            <?php wp_nonce_field('krt_default_nonce', 'krt_default_nonce_field'); ?>
            <input type="hidden" name="krt_action" value="save_default_pack" />
            <input type="text" name="krt_default_pack" class="regular-text" value="<?php echo esc_attr($default_pack); ?>" />
            <button class="button button-primary">Save Default</button>
            <p class="description">Front end loads this deck by default. For QA, you can override via <code>?deck=Your%20Deck</code> on the game URL.</p>
        </form>

        <!-- Bulk Assign moved to the top -->
        <h2>Bulk Assign Pack</h2>
        <form method="post" style="margin:10px 0 30px;">
            <?php wp_nonce_field('krt_bulk_nonce', 'krt_bulk_nonce_field'); ?>
            <input type="hidden" name="krt_action" value="bulk_assign" />
            <p>
                <label>Challenge IDs (comma separated):</label><br/>
                <input type="text" name="ids" class="regular-text" placeholder="e.g. 1,2,3" />
            </p>
            <p>
                <label>Card Pack:</label><br/>
                <input type="text" name="card_pack" class="regular-text" placeholder="Original Pack" />
            </p>
            <p><button class="button">Assign Pack</button></p>
        </form>

        <!-- Export / Import -->
        <h2>Export / Import</h2>
        <div style="display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap;">
            <!-- Export -->
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="max-width:480px;">
                <?php wp_nonce_field('krt_export_nonce', 'krt_export_nonce_field'); ?>
                <input type="hidden" name="action" value="krt_export" />
                <!-- preserve current filters/sorts -->
                <input type="hidden" name="s" value="<?php echo esc_attr($search); ?>" />
                <input type="hidden" name="sort" value="<?php echo esc_attr($sort); ?>" />
                <p><label><input type="radio" name="scope" value="view" checked /> Export <strong>Current View</strong> (respects search & sort)</label></p>
                <p><label><input type="radio" name="scope" value="all" /> Export <strong>All Challenges</strong></label></p>
                <p><button class="button button-primary">Export CSV</button></p>
                <p class="description">Columns: id, challenge_text, has_bonus, card_pack, created_at, likes, dislikes</p>
            </form>

            <!-- Import -->
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" enctype="multipart/form-data" style="max-width:520px;">
                <?php wp_nonce_field('krt_import_nonce', 'krt_import_nonce_field'); ?>
                <input type="hidden" name="action" value="krt_import" />
                <p><label>CSV File: <input type="file" name="csv_file" accept=".csv" required></label></p>
                <p>
                    <label>Mode:</label><br>
                    <label><input type="radio" name="mode" value="upsert" checked> Upsert by ID (update if ID exists, insert otherwise)</label><br>
                    <label><input type="radio" name="mode" value="append"> Append (ignore IDs, add all as new)</label>
                </p>
                <p>
                    <label><input type="checkbox" name="dry_run" value="1" checked> Dry run (preview only, no changes)</label><br>
                    <label><input type="checkbox" name="seed_votes" value="1"> Seed like/dislike counters from CSV (advanced)</label><br>
                    <label style="margin-left:24px;"><input type="checkbox" name="seed_reset" value="1"> When seeding, clear existing votes for imported rows first</label>
                </p>
                <p><button class="button button-primary">Run Import</button></p>
                <p class="description">CSV columns accepted (case-insensitive): id, challenge_text, has_bonus (0/1), card_pack, created_at (YYYY-MM-DD HH:MM:SS), likes, dislikes.<br>Leave <em>id</em> blank to insert a new row.</p>
            </form>
        </div>

        <?php
        // Edit form (top)
        if ($editing): ?>
        <h2>Edit Challenge #<?php echo esc_html($editing['id']); ?></h2>
        <form method="post" style="margin-bottom:30px;">
            <?php wp_nonce_field('krt_challenge_nonce', 'krt_challenge_nonce_field'); ?>
            <input type="hidden" name="krt_action" value="edit" />
            <input type="hidden" name="id" value="<?php echo esc_attr($editing['id']); ?>" />
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="challenge_text_edit">Challenge Text</label></th>
                    <td><textarea id="challenge_text_edit" name="challenge_text" rows="3" class="large-text" required><?php echo esc_textarea($editing['challenge_text']); ?></textarea></td>
                </tr>
                <tr>
                    <th scope="row"><label for="card_pack_edit">Card Pack</label></th>
                    <td><input id="card_pack_edit" name="card_pack" type="text" class="regular-text" value="<?php echo esc_attr($editing['card_pack']); ?>" required /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="has_bonus_edit">Bonus?</label></th>
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
        <?php else: ?>
        <h2>Add New Challenge</h2>
        <form id="krt-add-challenge-form" method="post">
            <?php wp_nonce_field('krt_challenge_nonce', 'krt_challenge_nonce_field'); ?>
            <input type="hidden" name="krt_action" value="add" />
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="challenge_text">Challenge Text</label></th>
                    <td><textarea id="challenge_text" name="challenge_text" rows="3" class="large-text" required></textarea></td>
                </tr>
                <tr>
                    <th scope="row"><label for="card_pack">Card Pack</label></th>
                    <td><input id="card_pack" name="card_pack" type="text" class="regular-text" placeholder="Original Pack" required /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="has_bonus">Bonus?</label></th>
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
        </form>
        <?php endif; ?>

        <hr/>

        <h2>Existing Challenges</h2>
        <form method="post" style="margin:10px 0;">
            <?php wp_nonce_field('krt_clear_nonce', 'krt_clear_nonce_field'); ?>
            <input type="hidden" name="krt_action" value="clear_counters" />
            <button class="button" onclick="return confirm('Reset ALL like/dislike counters?')">Reset All Counters</button>
        </form>

        <table class="widefat fixed striped">
            <thead>
                <tr>
                    <th style="width:60px;">ID</th>
                    <th>Challenge</th>
                    <th style="width:90px;">Bonus</th>
                    <th style="width:160px;">Pack</th>
                    <th style="width:90px;">Like</th>
                    <th style="width:90px;">Dislike</th>
                    <th style="width:180px;">Created</th>
                    <th style="width:180px;">Actions</th>
                </tr>
            </thead>
            <tbody>
            <?php if (!empty($rows)): foreach ($rows as $c): ?>
                <tr>
                    <td><?php echo esc_html($c['id']); ?></td>
                    <td><?php echo esc_html($c['challenge_text']); ?></td>
                    <td><?php echo intval($c['has_bonus']) ? 'Yes' : 'No'; ?></td>
                    <td><?php echo esc_html($c['card_pack']); ?></td>
                    <td><strong><?php echo intval($c['likes']); ?></strong></td>
                    <td><strong><?php echo intval($c['dislikes']); ?></strong></td>
                    <td><?php echo esc_html($c['created_at']); ?></td>
                    <td>
                        <a class="button" href="<?php echo esc_url( add_query_arg(array('page'=>'knotty-roulette','edit'=>$c['id']), admin_url('admin.php')) ); ?>">Edit</a>
                        <form method="post" style="display:inline-block; margin-left:6px;">
                            <?php wp_nonce_field('krt_challenge_nonce', 'krt_challenge_nonce_field'); ?>
                            <input type="hidden" name="krt_action" value="delete" />
                            <input type="hidden" name="id" value="<?php echo esc_attr($c['id']); ?>" />
                            <button class="button button-secondary" onclick="return confirm('Delete this challenge?')">Delete</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; else: ?>
                <tr><td colspan="8">No challenges found.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>
    </div>

    <!-- Tiny inline script to toggle the bonus syntax hint on Add & Edit forms -->
    <script>
    (function(){
        function toggleHint(checkbox, hintEl) {
            if (!checkbox || !hintEl) return;
            hintEl.style.display = checkbox.checked ? 'block' : 'none';
        }
        document.querySelectorAll('form').forEach(function(form){
            var chk  = form.querySelector('.krt-bonus-toggle');
            var hint = form.querySelector('.krt-bonus-hint');
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
        case 'likes':
            $sql .= " ORDER BY likes DESC, c.id DESC ";
            break;
        case 'dislikes':
            $sql .= " ORDER BY dislikes DESC, c.id DESC ";
            break;
        case 'newest':
        default:
            $sql .= " ORDER BY c.created_at DESC ";
            break;
    }

    // Limit only if scope=view
    if ($scope !== 'all') {
        $sql .= " LIMIT 500 ";
    }

    $rows = $params ? $wpdb->get_results($wpdb->prepare($sql, $params), ARRAY_A)
                    : $wpdb->get_results($sql, ARRAY_A);

    // Output CSV
    $filename = 'knotty_challenges_' . date('Ymd_His') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=' . $filename);
    header('Pragma: no-cache');
    header('Expires: 0');

    $out = fopen('php://output', 'w');
    // UTF-8 BOM for Excel
    fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));

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
        wp_redirect(add_query_arg(array('page'=>'knotty-roulette','krt_msg'=>'no_file'), admin_url('admin.php')));
        exit;
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
        wp_redirect(add_query_arg(array('page'=>'knotty-roulette','krt_msg'=>'file_open_error'), admin_url('admin.php')));
        exit;
    }

    // Read header, map columns
    $header = fgetcsv($fh);
    if (!$header) {
        fclose($fh);
        wp_redirect(add_query_arg(array('page'=>'knotty-roulette','krt_msg'=>'bad_header'), admin_url('admin.php')));
        exit;
    }

    $map = array(); // normalized name => index
    foreach ($header as $idx => $name) {
        $norm = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '_', $name)));
        $map[$norm] = $idx;
    }
    // Helper to get col by normalized key
    $col = function($row, $key) use ($map) {
        if (!isset($map[$key])) return '';
        $val = isset($row[$map[$key]]) ? $row[$map[$key]] : '';
        return is_string($val) ? trim($val) : $val;
    };

    $ins = $upd = $skipped = 0;
    $seeded = 0;
    $errors = array();
    $line = 1; // counting from 1 including header

    while (($row = fgetcsv($fh)) !== false) {
        $line++;

        $id            = trim($col($row, 'id'));
        $text          = $col($row, 'challenge_text');
        if ($text === '') $text = $col($row, 'challenge'); // fallback
        $pack          = $col($row, 'card_pack');
        $has_bonus_in  = $col($row, 'has_bonus');
        $has_bonus     = krt_boolish_to_int($has_bonus_in);
        $created       = $col($row, 'created_at');
        $likes_csv     = intval($col($row, 'likes'));
        $dislikes_csv  = intval($col($row, 'dislikes'));

        if ($text === '' || $pack === '') {
            $skipped++; $errors[] = "Line {$line}: missing challenge_text or card_pack"; continue;
        }

        $existing = null;
        $will_update = false;

        if ($mode === 'upsert' && ctype_digit($id) && intval($id) > 0) {
            $existing = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$tbl_challenges} WHERE id=%d", intval($id)), ARRAY_A);
            $will_update = (bool)$existing;
        }

        if ($dry_run) {
            if ($will_update) $upd++; else $ins++;
            if ($seed_votes) $seeded += ($likes_csv + $dislikes_csv);
            continue;
        }

        // Not dry run: perform DB write
        if ($will_update) {
            $wpdb->update($tbl_challenges, array(
                'challenge_text' => $text,
                'card_pack'      => $pack,
                'has_bonus'      => $has_bonus
            ), array('id' => intval($id)), array('%s','%s','%d'), array('%d'));
            $upd++;
            $challenge_id = intval($id);
        } else {
            // insert new; ignore provided id for safety
            $data = array(
                'challenge_text' => $text,
                'card_pack'      => $pack,
                'has_bonus'      => $has_bonus
            );
            $fmt  = array('%s','%s','%d');
            if ($created !== '') {
                $ts = strtotime($created);
                if ($ts !== false) { $data['created_at'] = date('Y-m-d H:i:s', $ts); $fmt[] = '%s'; }
            }
            $ok = $wpdb->insert($tbl_challenges, $data, $fmt);
            if ($ok === false) {
                $skipped++; $errors[] = "Line {$line}: DB insert failed";
                continue;
            }
            $ins++;
            $challenge_id = intval($wpdb->insert_id);
        }

        // Seed votes if requested
        if ($seed_votes) {
            if ($seed_reset) {
                $wpdb->delete($tbl_responses, array('challenge_id' => $challenge_id), array('%d'));
            }
            // Count current
            $current = $wpdb->get_row($wpdb->prepare("
                SELECT 
                    COALESCE(SUM(CASE WHEN vote_type='like' THEN 1 ELSE 0 END),0) AS likes,
                    COALESCE(SUM(CASE WHEN vote_type='dislike' THEN 1 ELSE 0 END),0) AS dislikes
                FROM {$tbl_responses} WHERE challenge_id=%d
            ", $challenge_id), ARRAY_A);

            $need_like    = max(0, $likes_csv - intval($current['likes']));
            $need_dislike = max(0, $dislikes_csv - intval($current['dislikes']));

            // Insert the minimal additional rows needed
            for ($i=0; $i<$need_like; $i++) {
                $wpdb->insert($tbl_responses, array(
                    'challenge_id' => $challenge_id,
                    'vote_type'    => 'like'
                ), array('%d','%s'));
            }
            for ($i=0; $i<$need_dislike; $i++) {
                $wpdb->insert($tbl_responses, array(
                    'challenge_id' => $challenge_id,
                    'vote_type'    => 'dislike'
                ), array('%d','%s'));
            }
            $seeded += ($need_like + $need_dislike);
        }
    }
    fclose($fh);

    $msg = array();
    if ($dry_run) $msg[] = 'Dry run only.';
    $msg[] = "Inserted: {$ins}";
    $msg[] = "Updated: {$upd}";
    if ($skipped) $msg[] = "Skipped: {$skipped}";
    if ($seed_votes) $msg[] = "Votes seeded: {$seeded}";
    if (!empty($errors)) {
        // store errors in transient for display (5 minutes)
        $key = 'krt_import_errors_' . get_current_user_id();
        set_transient($key, $errors, 5 * MINUTE_IN_SECONDS);
        wp_redirect(add_query_arg(array(
            'page' => 'knotty-roulette',
            'krt_msg' => rawurlencode(implode(' | ', $msg)),
            'krt_errkey' => $key
        ), admin_url('admin.php')));
    } else {
        wp_redirect(add_query_arg(array(
            'page' => 'knotty-roulette',
            'krt_msg' => rawurlencode(implode(' | ', $msg))
        ), admin_url('admin.php')));
    }
    exit;
}

/* Show import messages if any */
add_action('admin_notices', function() {
    if (!is_admin() || !isset($_GET['page']) || $_GET['page'] !== 'knotty-roulette') return;
    if (isset($_GET['krt_msg'])) {
        echo '<div class="updated"><p>' . esc_html($_GET['krt_msg']) . '</p></div>';
    }
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
 * Frontend AJAX: fetch challenges + vote  (GET/POST + strict has_bonus)
 * ========================================================================== */
add_action('wp_ajax_nopriv_krt_fetch_challenges', 'krt_fetch_challenges');
add_action('wp_ajax_krt_fetch_challenges', 'krt_fetch_challenges');
function krt_fetch_challenges() {
    // Accept nonce from 'nonce' or '_ajax_nonce' and via GET/POST
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
    // Accept nonce from 'nonce' or '_ajax_nonce' and via GET/POST
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

    $ok = $wpdb->insert($tbl_responses, array(
        'challenge_id' => $challenge_id,
        'vote_type'    => $vote_type
    ), array('%d','%s'));

    if ($ok) { wp_send_json_success(true); }
    else { wp_send_json_error('Failed to record vote'); }
}
