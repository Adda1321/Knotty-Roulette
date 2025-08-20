<?php
/*
Plugin Name: Knotty Roulette Tracker
Description: Tracks upvote and downvote responses for Knotty Roulette game and manages challenges.
Version: 1.7
Author: Your Name
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Create responses table on plugin activation
register_activation_hook(__FILE__, 'krt_create_table');
function krt_create_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_responses';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table_name (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        response_type VARCHAR(50) NOT NULL,
        challenge_id BIGINT(20) UNSIGNED DEFAULT NULL,
        challenge_text TEXT NOT NULL,
        response_date DATE NOT NULL,
        response_time TIME NOT NULL,
        PRIMARY KEY (id)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}

// Create challenges table on plugin activation
register_activation_hook(__FILE__, 'krt_create_challenges_table');
function krt_create_challenges_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_challenges';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table_name (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        challenge_text TEXT NOT NULL,
        has_bonus TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);

    // Seed challenges if table is empty
    krt_seed_challenges();
}

// Seed challenges table with hardcoded challenges
function krt_seed_challenges() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_challenges';

    // Check if table is empty
    $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
    if ($count > 0) {
        return;
    }

    // Hardcoded challenges from front-end
    $challenges = [
        "Give a flirty compliment to someone in the group or a stranger – Bonus if a stranger!",
        "Show off your best dance moves! – Bonus if you commit for at least 10 seconds!",
        "Ask the bartender or a friend for their best flirting advice – Bonus if you actually try it on someone!",
        "Flirt with someone using only song lyrics – Bonus if they don’t notice!",
        "Remove your can’s tab and flick it like a football through someone’s goalpost hands – Miss? Take a sip! Bonus if you make it. 🏈🍻",
        "Do your best celebrity impression – Bonus if they guess who it is!",
        "Reveal something about yourself that no one in the group knows – Bonus if it's Knotty!",
        "Make a toast with only eye contact—no words! – Bonus if someone laughs first!",
        "Ask the group: “Would you rather” and make up a wild scenario – Bonus if everyone answers!",
        "Say something completely ridiculous with full confidence – Bonus if you get someone to believe it!",
        "Challenge someone to a dance-off – Loser must finish their drink!",
        "Challenge someone to a rock-paper-scissors match – Loser takes a sip!",
        "Buy someone a Knotty Times – Your choice who gets lucky!",
        "Bottoms up! – Whatever’s left in your drink, finish it now!",
        "Make a toast to the group – The more ridiculous, the better.",
        "Blow a kiss to someone in the group – Make it obvious.",
        "Secretly pick someone in the group until your next turn, copy their drink movements without getting caught – If they catch you, finish your drink!",
        "Clink glasses with someone in the group - give them a ridiculous compliment.",
        "Do a fake pickup line on someone in the group – The cheesier, the better!",
        "Take a sip & stare at someone until they notice – No breaking eye contact!",
        "Let the group decide if you should take a sip, take a shot, or skip this round - majority rules! 🍻🔥",
        "Announce another player's drink choice like a sports commentator giving a play-by-play! – Hold your drink like a pretend mic while doing it!",
        "Start a chant – Even if it’s just 'One more round!'",
        "Pretend you know a stranger for 30 seconds – Sell it!",
        "Do an exaggerated sexy walk to the bathroom – Full confidence!",
        "Take a selfie with someone in the group – Make it extra dramatic.",
        "Try to get someone in the group to high-five you without asking – Be creative!",
        "Let the person to your left make up a dare for you – No backing out!",
        "Start an impromptu karaoke moment – Even if there’s no karaoke.",
        "Whisper a random word in someone’s ear – Then walk away like nothing happened.",
        "The group picks three people (real or fictional) and presents them to the chosen player. That player must decide who to Fuck, Marry, or Kill - no backing out!",
        "Say something spicy in the most innocent voice possible – Keep a straight face!",
        "Lick your lips & wink at someone in the group – See if they react.",
        "Make eye contact with someone in the group for 10 seconds – No breaking first!",
        "Take a sip without using your hands – Get creative!",
        "Whisper a made-up secret to someone in the group – Make it juicy.",
        "Tell the group your worst pickup line ever – Then try using it!",
        "Get a stranger to fist-bump you – No explanation allowed.",
        "Try to make someone in the group blush – No touching allowed!",
        "Hold eye contact with someone while slowly sipping your drink – No blinking!",
        "Tell the group about your most embarrassing night out moment – No holding back.",
        "Pick a dance move and do it for the next 10 seconds – No stopping!",
        "Do an over-the-top dramatic reaction to the next thing someone says – Oscar-worthy.",
        "Ask someone in the group a “truth or dare” question – They must answer!",
        "Let someone in the group come up with a “new name” for you – Use it for the rest of the game!",
        "Find out a fun fact about the person sitting next to you – Then share it!",
        "Make up a wild story about how you and another player met – Sell it like it’s 100% true!",
        "Fake a phone call and have a dramatic conversation – Keep it entertaining!",
        "Give an overly dramatic apology to the group for something you didn’t do the more ridiculous the better – No laughing!",
        "Say a ‘Never Have I Ever’ statement - anyone who’s done it takes a sip! 🍻🔥",
        "Who is most likely to [do something wild or embarrassing]? – The group votes, and the person with the most votes drinks! 😆",
        "Balance your drink on the back of your hand and try to take a sip without spilling. – Spill? Drink again! 🍹🎭",
        "Drink, then flip your empty cup or coaster onto the table - first to land it wins! – Loser drinks! 🔄🍺",
        "Go around the table counting aloud, but say 'Knotty' instead of any number with a 7 or a multiple of 7! - Mess up? Take a sip! 🔢🍻",
        "Name a famous person. The next player must say a name that starts with the last letter of yours. – Can't think of one? Drink! 🎤🔥",
        "Tell the group two truths and one lie about yourself. The group must guess which one is the lie. - Whoever guesses wrong must finish their drink!",
        "The group picks an accent, and the chosen player must speak in that accent until their next turn - no backing out!",
        "Say the alphabet backwards - If successful every other player must take a sip. If not, you need to.",
        "Call someone you know and say “I need to hide a body” – No voice mail",
        "Act out a charade no talking you have 2 minutes - if the group guesses correctly they drink if not you drink.",
        "You must only refer to yourself by name for the next two rounds – Forget? drink.",
        "Swap shirts with the person to your right for two rounds - No shirt, no swap, no excuses…"
    ];

    foreach ($challenges as $challenge) {
        $has_bonus = strpos($challenge, 'Bonus') !== false ? 1 : 0;
        $wpdb->insert(
            $table_name,
            [
                'challenge_text' => $challenge,
                'has_bonus' => $has_bonus,
                'created_at' => gmdate('Y-m-d H:i:s', time() - 5 * 3600) // EST
            ],
            ['%s', '%d', '%s']
        );
    }
}

// Database migration for responses table
register_activation_hook(__FILE__, 'krt_update_responses_table_schema');
function krt_update_responses_table_schema() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_responses';

    if ($wpdb->get_var("SHOW COLUMNS FROM $table_name LIKE 'challenge_id'") != 'challenge_id') {
        $sql = "ALTER TABLE $table_name ADD COLUMN challenge_id BIGINT(20) UNSIGNED DEFAULT NULL AFTER response_type";
        $wpdb->query($sql);
    }
}

// AJAX handler to log responses
add_action('wp_ajax_krt_log_response', 'krt_log_response');
add_action('wp_ajax_nopriv_krt_log_response', 'krt_log_response');
function krt_log_response() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_responses';

    $response_type = isset($_POST['response_type']) ? sanitize_text_field($_POST['response_type']) : '';
    $challenge_id = isset($_POST['challenge_id']) ? absint($_POST['challenge_id']) : null;
    $challenge_text = isset($_POST['challenge_text']) ? sanitize_text_field($_POST['challenge_text']) : '';

    if (in_array($response_type, ['upvote', 'downvote'])) {
        $wpdb->insert(
            $table_name,
            [
                'response_type' => $response_type,
                'challenge_id' => $challenge_id,
                'challenge_text' => $challenge_text,
                'response_date' => gmdate('Y-m-d', time() - 5 * 3600), // EST
                'response_time' => gmdate('H:i:s', time() - 5 * 3600) // EST
            ],
            ['%s', '%d', '%s', '%s', '%s']
        );
        wp_send_json_success('Response logged');
    } else {
        wp_send_json_error('Invalid response type');
    }
}

// AJAX handler to get challenges
add_action('wp_ajax_krt_get_challenges', 'krt_get_challenges');
add_action('wp_ajax_nopriv_krt_get_challenges', 'krt_get_challenges');
function krt_get_challenges() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_challenges';
    $challenges = $wpdb->get_results("SELECT id, challenge_text, has_bonus FROM $table_name ORDER BY id DESC", ARRAY_A);
    wp_send_json_success($challenges);
}

// AJAX handler to add challenge
add_action('wp_ajax_krt_add_challenge', 'krt_add_challenge');
function krt_add_challenge() {
    check_ajax_referer('krt_challenge_nonce', 'nonce');
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_challenges';

    $challenge_text = isset($_POST['challenge_text']) ? sanitize_textarea_field($_POST['challenge_text']) : '';
    $has_bonus = isset($_POST['has_bonus']) && $_POST['has_bonus'] == '1' ? 1 : 0;

    if (empty($challenge_text)) {
        error_log('KRT: Add challenge failed - empty challenge text');
        wp_send_json_error('Challenge text is required');
    }

    $result = $wpdb->insert(
        $table_name,
        [
            'challenge_text' => $challenge_text,
            'has_bonus' => $has_bonus,
            'created_at' => gmdate('Y-m-d H:i:s', time() - 5 * 3600) // EST
        ],
        ['%s', '%d', '%s']
    );

    if ($result === false) {
        error_log('KRT: Add challenge failed - database error: ' . $wpdb->last_error);
        wp_send_json_error('Failed to add challenge');
    }

    $challenge_id = $wpdb->insert_id;
    wp_send_json_success([
        'id' => $challenge_id,
        'challenge_text' => $challenge_text,
        'has_bonus' => $has_bonus,
        'created_at' => gmdate('Y-m-d H:i:s', time() - 5 * 3600) // EST
    ]);
}

// AJAX handler to edit challenge
add_action('wp_ajax_krt_edit_challenge', 'krt_edit_challenge');
function krt_edit_challenge() {
    check_ajax_referer('krt_challenge_nonce', 'nonce');
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_challenges';

    $challenge_id = isset($_POST['challenge_id']) ? absint($_POST['challenge_id']) : 0;
    $challenge_text = isset($_POST['challenge_text']) ? sanitize_textarea_field($_POST['challenge_text']) : '';
    $has_bonus = isset($_POST['has_bonus']) && $_POST['has_bonus'] == '1' ? 1 : 0;

    if (empty($challenge_text) || $challenge_id <= 0) {
        error_log('KRT: Edit challenge failed - invalid data: ' . json_encode($_POST));
        wp_send_json_error('Invalid challenge data');
    }

    $result = $wpdb->update(
        $table_name,
        [
            'challenge_text' => $challenge_text,
            'has_bonus' => $has_bonus
        ],
        ['id' => $challenge_id],
        ['%s', '%d'],
        ['%d']
    );

    if ($result === false) {
        error_log('KRT: Edit challenge failed - database error: ' . $wpdb->last_error);
        wp_send_json_error('Failed to update challenge');
    }

    wp_send_json_success('Challenge updated');
}

// AJAX handler to delete challenge
add_action('wp_ajax_krt_delete_challenge', 'krt_delete_challenge');
function krt_delete_challenge() {
    check_ajax_referer('krt_challenge_nonce', 'nonce');
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_challenges';

    $challenge_id = isset($_POST['challenge_id']) ? absint($_POST['challenge_id']) : 0;

    if ($challenge_id <= 0) {
        error_log('KRT: Delete challenge failed - invalid ID');
        wp_send_json_error('Invalid challenge ID');
    }

    $result = $wpdb->delete($table_name, ['id' => $challenge_id], ['%d']);
    if ($result === false) {
        error_log('KRT: Delete challenge failed - database error: ' . $wpdb->last_error);
        wp_send_json_error('Failed to delete challenge');
    }

    wp_send_json_success('Challenge deleted');
}

// AJAX handler to clear responses data
add_action('wp_ajax_krt_clear_data', 'krt_clear_data');
function krt_clear_data() {
    check_ajax_referer('krt_clear_nonce', 'nonce');
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_responses';
    $wpdb->query("TRUNCATE TABLE $table_name");
    wp_send_json_success('Data cleared');
}

// Enqueue script with AJAX URL for frontend
add_action('wp_enqueue_scripts', 'krt_enqueue_scripts');
function krt_enqueue_scripts() {
    wp_enqueue_script('krt-ajax', plugin_dir_url(__FILE__) . 'krt-ajax.js', ['jquery'], '1.7', true);
    wp_localize_script('krt-ajax', 'krt_ajax', [
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('krt_nonce'),
        'challenge_nonce' => wp_create_nonce('krt_challenge_nonce')
    ]);
}

// Admin page scripts
add_action('admin_enqueue_scripts', 'krt_admin_enqueue_scripts');
function krt_admin_enqueue_scripts($hook) {
    if ($hook !== 'knotty-roulette_page_knotty-roulette-responses' && $hook !== 'knotty-roulette_page_krt-manage-challenges') {
        return;
    }
    wp_enqueue_script('krt-admin', plugin_dir_url(__FILE__) . 'krt-admin.js', ['jquery'], '1.7', true);
    wp_localize_script('krt-admin', 'krt_admin_ajax', [
        'ajax_url' => admin_url('admin-ajax.php'),
        'clear_nonce' => wp_create_nonce('krt_clear_nonce'),
        'challenge_nonce' => wp_create_nonce('krt_challenge_nonce')
    ]);
}

// Admin menu
add_action('admin_menu', 'krt_add_admin_menu');
function krt_add_admin_menu() {
    // Parent menu (no page, just a container)
    add_menu_page(
        'Knotty Roulette',
        'Knotty Roulette',
        'manage_options',
        'knotty-roulette',
        null,
        'dashicons-games',
        80
    );

    // Responses submenu (default page)
    add_submenu_page(
        'knotty-roulette',
        'Roulette Responses',
        'Responses',
        'manage_options',
        'knotty-roulette-responses',
        'krt_display_responses'
    );

    // Challenges submenu
    add_submenu_page(
        'knotty-roulette',
        'Manage Challenges',
        'Manage Challenges',
        'manage_options',
        'krt-manage-challenges',
        'krt_display_challenges'
    );

    // Remove the parent menu's default page to avoid blank page
    remove_submenu_page('knotty-roulette', 'knotty-roulette');
}

// Highlight correct submenu
add_filter('parent_file', 'krt_highlight_submenu');
function krt_highlight_submenu($parent_file) {
    global $submenu_file;
    if (in_array(get_current_screen()->id, ['knotty-roulette_page_knotty-roulette-responses', 'knotty-roulette_page_krt-manage-challenges'])) {
        $parent_file = 'knotty-roulette';
        $submenu_file = get_current_screen()->id === 'knotty-roulette_page_knotty-roulette-responses' ? 'knotty-roulette-responses' : 'krt-manage-challenges';
    }
    return $parent_file;
}

// Display responses admin page
function krt_display_responses() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_responses';
    $results = $wpdb->get_results("SELECT * FROM $table_name ORDER BY response_date DESC, response_time DESC");

    echo '<div class="wrap"><h1>Knotty Roulette Responses</h1>';
    echo '<p><button id="krt-clear-data" class="button button-secondary">Clear All Data</button> ';
    echo '<a href="' . admin_url('admin-ajax.php?action=krt_export_csv') . '" class="button button-primary">Export to CSV</a></p>';
    echo '<table class="wp-list-table widefat fixed striped">';
    echo '<thead><tr><th>ID</th><th>Response</th><th>Challenge ID</th><th>Challenge</th><th>Date</th><th>Time</th></tr></thead><tbody>';
    foreach ($results as $row) {
        $date = gmdate('Y-m-d', strtotime($row->response_date) - 5 * 3600); // EST
        $time = gmdate('H:i:s', strtotime($row->response_time) - 5 * 3600); // EST
        echo "<tr><td>" . esc_html($row->id) . "</td><td>" . esc_html($row->response_type) . "</td><td>" . ($row->challenge_id ? esc_html($row->challenge_id) : 'N/A') . "</td><td>" . esc_html($row->challenge_text) . "</td><td>" . esc_html($date) . "</td><td>" . esc_html($time) . "</td></tr>";
    }
    echo '</tbody></table></div>';
}

// Display challenges admin page
function krt_display_challenges() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_challenges';
    $challenges = $wpdb->get_results("SELECT * FROM $table_name ORDER BY id DESC");
    ?>
    <div class="wrap">
        <h1>Manage Challenges</h1>
        <h2>Search Challenges</h2>
        <form id="krt-search-challenges-form">
            <input type="text" id="krt-search-input" placeholder="Search by challenge text..." style="width: 300px; padding: 5px;">
            <button type="button" id="krt-clear-search" class="button button-secondary">Clear</button>
            <p class="description">Enter a keyword to filter challenges (e.g., "flirt", "dance").</p>
        </form>
        <h2>Add New Challenge</h2>
        <form id="krt-add-challenge-form">
            <table class="form-table">
                <tr>
                    <th><label for="challenge_text">Challenge Text</label></th>
                    <td>
                        <textarea name="challenge_text" id="challenge_text" rows="4" style="width: 100%; max-width: 600px;" required></textarea>
                        <p class="description">Use format: "Action – Bonus if..." for bonus challenges.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="has_bonus">Has Bonus</label></th>
                    <td>
                        <input type="checkbox" name="has_bonus" id="has_bonus" value="1">
                        <span class="description">Check if the challenge offers a bonus point opportunity.</span>
                    </td>
                </tr>
            </table>
            <p class="submit">
                <input type="submit" class="button button-primary" value="Add Challenge">
            </p>
        </form>
        <h2>Existing Challenges</h2>
        <table class="wp-list-table widefat fixed striped" id="krt-challenges-table">
            <thead>
                <tr>
                    <th style="width: 60px;">ID</th>
                    <th>Challenge Text</th>
                    <th style="width: 100px;">Has Bonus</th>
                    <th style="width: 160px;">Created At</th>
                    <th style="width: 150px;">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($challenges as $challenge) : ?>
                    <tr data-id="<?php echo esc_attr($challenge->id); ?>">
                        <td><?php echo esc_html($challenge->id); ?></td>
                        <td><?php echo esc_html($challenge->challenge_text); ?></td>
                        <td><?php echo $challenge->has_bonus ? 'Yes' : 'No'; ?></td>
                        <td><?php echo esc_html(gmdate('Y-m-d H:i:s', strtotime($challenge->created_at) - 5 * 3600)); // EST ?></td>
                        <td>
                            <button class="button button-secondary krt-edit-challenge" data-id="<?php echo esc_attr($challenge->id); ?>" data-text="<?php echo esc_attr($challenge->challenge_text); ?>" data-has-bonus="<?php echo esc_attr($challenge->has_bonus); ?>">Edit</button>
                            <button class="button button-secondary krt-delete-challenge" data-id="<?php echo esc_attr($challenge->id); ?>">Delete</button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <style>
        #krt-add-challenge-form textarea { width: 100%; max-width: 600px; }
        #krt-add-challenge-form .form-table th { width: 150px; }
        .krt-edit-challenge, .krt-delete-challenge { margin-right: 5px; }
        .wp-list-table th, .wp-list-table td { vertical-align: middle; }
        .wp-list-table td { word-break: break-word; }
        #krt-search-challenges-form { margin-bottom: 20px; }
        #krt-search-input { margin-right: 10px; }
        #krt-clear-search { vertical-align: middle; }
    </style>
    <?php
}

// AJAX handler to export CSV
add_action('wp_ajax_krt_export_csv', 'krt_export_csv');
function krt_export_csv() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'knotty_roulette_responses';
    $results = $wpdb->get_results("SELECT * FROM $table_name ORDER BY response_date DESC, response_time DESC", ARRAY_A);

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="knotty_roulette_responses_' . date('Y-m-d_H-i-s') . '.csv"');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');

    $output = fopen('php://output', 'w');
    fputcsv($output, ['ID', 'Response', 'Challenge ID', 'Challenge', 'Date', 'Time']);
    foreach ($results as $row) {
        $date = gmdate('Y-m-d', strtotime($row['response_date']) - 5 * 3600); // EST
        $time = gmdate('H:i:s', strtotime($row['response_time']) - 5 * 3600); // EST
        fputcsv($output, [$row['id'], $row['response_type'], $row['challenge_id'] ?: 'N/A', $row['challenge_text'], $date, $time]);
    }
    fclose($output);
    exit;
}