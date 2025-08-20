// krt-ajax.js
jQuery(document).ready(function($) {
    // Log upvote/downvote response
    window.krtLogResponse = function(challengeIndex, challengeText, playerName, voteType) {
        console.log('krtLogResponse called:', {
            challengeIndex: challengeIndex,
            challengeText: challengeText,
            playerName: playerName,
            voteType: voteType
        });

        $.ajax({
            url: krt_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'krt_log_response',
                response_type: voteType,
                challenge_id: challengeIndex,
                challenge_text: challengeText,
                nonce: krt_ajax.nonce
            },
            success: function(response) {
                console.log('Vote logged successfully:', response);
                if (!response.success) {
                    console.warn('Server returned an error:', response.data);
                }
            },
            error: function(error) {
                console.error('Error logging vote:', error.responseText);
            }
        });
    };

    // Fetch challenges from backend
    window.krtFetchChallenges = function(callback) {
        console.log('krtFetchChallenges called');
        $.ajax({
            url: krt_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'krt_get_challenges',
                nonce: krt_ajax.nonce
            },
            success: function(response) {
                console.log('Challenges fetched:', response);
                if (response.success && response.data) {
                    callback(response.data);
                } else {
                    console.warn('Failed to fetch challenges:', response.data);
                    callback(null);
                }
            },
            error: function(error) {
                console.error('Error fetching challenges:', error.responseText);
                callback(null);
            }
        });
    };
});