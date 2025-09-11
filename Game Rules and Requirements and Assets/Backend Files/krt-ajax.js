/* krt-ajax.js (robust + GET fallback) */
jQuery(document).ready(function ($) {
  // Build ajax URL with action in the querystring too (helps some WAF/CDNs)
  function ajaxUrlWithAction(action) {
    var base = (typeof window.krt_ajax !== 'undefined' && krt_ajax.ajax_url)
      ? krt_ajax.ajax_url
      : '/wp-admin/admin-ajax.php';
    var sep = base.indexOf('?') === -1 ? '?' : '&';
    return base + sep + 'action=' + encodeURIComponent(action);
  }

  function currentNonce() {
    return (typeof window.krt_ajax !== 'undefined' && krt_ajax.nonce) ? krt_ajax.nonce : '';
  }

  // ------------------- VOTE (👍/👎) -------------------
  window.krtLogResponse = function (challengeId, challengeText, playerName, voteType) {
    var url = ajaxUrlWithAction('krt_vote');
    var nonce = currentNonce();

    console.log('[krtLogResponse] url=', url, 'nonce?', !!nonce, { challengeId, voteType });

    $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: {
        // action also in query string
        action: 'krt_vote',
        nonce: nonce,          // common name
        _ajax_nonce: nonce,    // alt name accepted by WP
        challenge_id: challengeId,
        vote_type: voteType
      },
      success: function (resp, textStatus, xhr) {
        console.log('[krtLogResponse] success', { status: xhr.status, resp: resp });
        if (!resp || !resp.success) {
          console.warn('[krtLogResponse] server error', resp && resp.data);
        }
      },
      error: function (xhr) {
        var txt = (xhr && xhr.responseText) ? xhr.responseText : '(no response text)';
        console.error('[krtLogResponse] HTTP error', { status: xhr && xhr.status, txt });
        try { console.log('parsed:', JSON.parse(txt)); } catch (_) {}
      }
    });
  };

  // ------------------- FETCH CHALLENGES -------------------
  /**
   * @param {(Array|null)=>void} callback
   * @param {string=} cardPack e.g., "Original Pack"
   */
  window.krtFetchChallenges = function (callback, cardPack) {
    var nonce = currentNonce();
    var base  = (typeof window.krt_ajax !== 'undefined' && krt_ajax.ajax_url)
      ? krt_ajax.ajax_url
      : '/wp-admin/admin-ajax.php';

    function qs(obj) {
      return Object.keys(obj).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
      }).join('&');
    }

    var payload = {
      action: 'krt_fetch_challenges',
      nonce: nonce,
      _ajax_nonce: nonce
    };
    if (cardPack) payload.card_pack = cardPack;

    var postUrl = base + (base.indexOf('?') === -1 ? '?action=krt_fetch_challenges' : '&action=krt_fetch_challenges');

    console.log('[krtFetchChallenges] POST url=', postUrl, 'payload=', payload);

    // Try POST first (normal path)
    $.ajax({
      url: postUrl,
      type: 'POST',
      data: payload,
      dataType: 'json',
      success: function (resp, textStatus, xhr) {
        console.log('[krtFetchChallenges] POST success', { status: xhr.status, resp: resp });
        if (resp && resp.success && resp.data) {
          return callback(resp.data);
        }
        console.warn('[krtFetchChallenges] POST success=false or empty data', resp && resp.data);
        callback(null);
      },
      error: function (xhr) {
        var code = xhr && xhr.status;
        var txt  = (xhr && xhr.responseText) ? xhr.responseText : '(no text)';
        console.error('[krtFetchChallenges] POST error', code, txt);

        // If POST is blocked (400 or "0"), retry with GET once
        if (code === 400 || txt === '0') {
          var getUrl = base + (base.indexOf('?') === -1 ? '?' : '&') + qs(payload);
          console.log('[krtFetchChallenges] retrying via GET:', getUrl);
          $.ajax({
            url: getUrl,
            type: 'GET',
            dataType: 'json',
            success: function (resp2, textStatus2, xhr2) {
              console.log('[krtFetchChallenges] GET success', { status: xhr2.status, resp: resp2 });
              if (resp2 && resp2.success && resp2.data) return callback(resp2.data);
              console.warn('[krtFetchChallenges] GET success=false or empty data', resp2 && resp2.data);
              callback(null);
            },
            error: function (xhr2) {
              var txt2 = (xhr2 && xhr2.responseText) ? xhr2.responseText : '(no text)';
              console.error('[krtFetchChallenges] GET error', xhr2 && xhr2.status, txt2);
              try {
                var maybe = JSON.parse(txt2);
                if (maybe && maybe.success && maybe.data) return callback(maybe.data);
              } catch (_) {}
              callback(null);
            }
          });
        } else {
          callback(null);
        }
      }
    });
  };

  console.log('krt-ajax.js loaded');
});
