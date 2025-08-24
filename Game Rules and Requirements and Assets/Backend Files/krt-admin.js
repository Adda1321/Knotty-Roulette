// krt-admin.js (v2.1)
jQuery(document).ready(function($) {
    if (typeof $ === 'undefined' || !$.fn || !$.fn.jquery) return;
    if (typeof krt_admin_ajax === 'undefined') return;

    // Cache elements
    const $form = $('#krt-add-challenge-form');
    const $challengeText = $('#challenge_text');
    const $hasBonus = $('#has_bonus');
    const $cardPack = $('#card_pack');
    const $submitBtn = $('#krt-submit-btn');

    // Helpers
    const normalize = (s) => (s || '').toString().trim();

    function updateSubmitState() {
        const textOk = normalize($challengeText.val()).length > 0;
        const packOk = normalize($cardPack.val()).length > 0;
        const enabled = textOk && packOk;
        $submitBtn.prop('disabled', !enabled);
        if (enabled) $submitBtn.removeClass('button-disabled');
        else $submitBtn.addClass('button-disabled');
    }

    // init state
    updateSubmitState();

    // Search
    $('#krt-search-input').on('keyup', function() {
        var query = ($(this).val() || '').toLowerCase();
        $('#krt-challenges-table tbody tr').each(function() {
            var text = $(this).find('td').eq(2).text().toLowerCase();
            var cardPack = $(this).find('td').eq(4).text().toLowerCase();
            $(this).toggle(text.includes(query) || cardPack.includes(query));
        });
    });
    $('#krt-search-clear').on('click', function() {
        $('#krt-search-input').val('').trigger('keyup');
    });

    // Bulk select
    $('#krt-select-all').on('change', function() {
        $('.krt-select-challenge').prop('checked', $(this).is(':checked'));
    });

    // Populate for edit
    $(document).on('click', '.krt-edit-challenge', function() {
        var row = $(this).closest('tr');
        var id = row.data('id');
        var text = $(this).data('text') || row.find('td').eq(2).text();
        var hasBonus = !!($(this).data('has-bonus'));
        var cardPack = $(this).data('card-pack') || row.find('td').eq(4).text();

        $challengeText.val(text);
        $hasBonus.prop('checked', hasBonus ? true : false).trigger('change');
        $cardPack.val(cardPack);

        $form[0].dataset.challengeId = id;
        $('#krt-form-title').text('Edit Challenge');
        $submitBtn.text('Update Challenge');

        updateSubmitState();
    });

    // Reset to Add
    $('#krt-reset-form').on('click', function() {
        $form[0].reset();
        delete $form[0].dataset.challengeId;
        $('#krt-form-title').text('Add New Challenge');
        $submitBtn.text('Add Challenge');
        updateSubmitState();
        $('.krt-bonus-hint').hide();
    });

    // Delete
    $(document).on('click', '.krt-delete-challenge', function() {
        if (!confirm('Delete this challenge? This cannot be undone.')) return;
        var id = $(this).closest('tr').data('id');
        $.ajax({
            url: krt_admin_ajax.ajax_url,
            method: 'POST',
            data: {
                action: 'krt_delete_challenge',
                nonce: krt_admin_ajax.challenge_nonce,
                challenge_id: id
            },
            success: function(r) {
                if (r.success) {
                    $(`tr[data-id="${id}"]`).remove();
                    alert('Challenge deleted.');
                } else {
                    alert('Failed to delete: ' + (r.data || 'Unknown error'));
                }
            },
            error: function(xhr) {
                alert('An error occurred while deleting. See console for details.');
                console.error(xhr);
            }
        });
    });

    // Live validation
    $challengeText.on('input', updateSubmitState);
    $cardPack.on('input', updateSubmitState);

    // Soft tip only when Bonus is toggled (no popups anywhere)
    $hasBonus.on('change', function() {
        if ($(this).is(':checked')) {
            $('.krt-bonus-hint').slideDown(150);
        } else {
            $('.krt-bonus-hint').slideUp(150);
        }
    });

    // Submit (add/edit)
    function bindFormSubmission() {
        var formEl = document.getElementById('krt-add-challenge-form');
        if (!formEl) return;

        formEl.addEventListener('submit', function(e) {
            e.preventDefault();

            // ensure valid
            updateSubmitState();
            if ($submitBtn.prop('disabled')) {
                alert('Please fill in both Challenge Text and Card Pack.');
                return;
            }

            var rawId = this.dataset.challengeId;
            var challengeId = (rawId && rawId !== '0') ? rawId : '';
            var action = challengeId ? 'krt_edit_challenge' : 'krt_add_challenge';

            var ajaxData = {
                action: action,
                nonce: krt_admin_ajax.challenge_nonce,
                challenge_text: normalize($challengeText.val()),
                has_bonus: $('#has_bonus').is(':checked') ? 1 : 0,
                card_pack: normalize($cardPack.val())
            };
            if (challengeId) ajaxData.challenge_id = challengeId;

            // prevent double submit
            $submitBtn.prop('disabled', true).text(action === 'krt_add_challenge' ? 'Adding…' : 'Updating…');

            fetch(krt_admin_ajax.ajax_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: Object.keys(ajaxData).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(ajaxData[k])).join('&')
            })
            .then(r => r.json())
            .then(data => {
                console.log('AJAX response:', data);
                if (data.success) {
                    if (action === 'krt_add_challenge') {
                        appendChallengeToTable(data.data || { id: data.id, text: ajaxData.challenge_text, has_bonus: !!ajaxData.has_bonus, card_pack: ajaxData.card_pack, created_at: new Date().toISOString() });
                        alert('Challenge added successfully.');
                    } else {
                        updateChallengeInTable(challengeId, ajaxData.challenge_text, !!ajaxData.has_bonus, ajaxData.card_pack);
                        alert('Challenge updated successfully.');
                    }
                    this.reset();
                    delete this.dataset.challengeId;
                    $('#krt-form-title').text('Add New Challenge');
                    $submitBtn.text('Add Challenge');
                    updateSubmitState();
                    try {
                        const $firstRow = $('#krt-challenges-table tbody tr').first();
                        if ($firstRow.length) {
                            $firstRow.addClass('krt-row-highlight');
                            setTimeout(() => $firstRow.removeClass('krt-row-highlight'), 1400);
                            window.scrollTo({ top: $firstRow.offset().top - 120, behavior: 'smooth' });
                        }
                    } catch(e) {}
                    $('.krt-bonus-hint').hide();
                } else {
                    alert('Error: ' + (data.data || 'Unknown error'));
                    $submitBtn.text(action === 'krt_add_challenge' ? 'Add Challenge' : 'Update Challenge');
                }
            })
            .catch(err => {
                console.error('Fetch error:', err);
                alert('An unexpected error occurred. Please check the console.');
                $submitBtn.text(action === 'krt_add_challenge' ? 'Add Challenge' : 'Update Challenge');
            })
            .finally(() => {
                updateSubmitState();
            });
        });
    }

    bindFormSubmission();
    $(document).on('krt-rebind-form', bindFormSubmission);

    // Table helpers
    function appendChallengeToTable(challenge) {
        var tbody = $('#krt-challenges-table tbody');
        var id = challenge.id || challenge.challenge_id || '';
        var text = challenge.text || challenge.challenge_text || '';
        var hasBonus = challenge.has_bonus ? 'Yes' : 'No';
        var cardPack = challenge.card_pack || '';
        var createdAt = challenge.created_at ? challenge.created_at : (new Date()).toISOString();

        var row = `
            <tr data-id="${id}">
                <td><input type="checkbox" class="krt-select-challenge" value="${id}"></td>
                <td>${id}</td>
                <td>${text}</td>
                <td>${hasBonus}</td>
                <td>${cardPack}</td>
                <td>${createdAt}</td>
                <td>
                    <button type="button" class="button button-secondary krt-edit-challenge"
                        data-text="${text.replace(/"/g, '&quot;')}"
                        data-has-bonus="${hasBonus === 'Yes' ? 1 : 0}"
                        data-card-pack="${cardPack.replace(/"/g, '&quot;')}">Edit</button>
                    <button type="button" class="button button-link-delete krt-delete-challenge">Delete</button>
                </td>
            </tr>
        `;
        tbody.prepend(row);
    }

    function updateChallengeInTable(challengeId, challengeText, hasBonus, cardPack) {
        var row = $(`tr[data-id="${challengeId}"]`);
        if (challengeText) row.find('td:eq(2)').text(challengeText);
        if (hasBonus !== null) row.find('td:eq(3)').text(hasBonus ? 'Yes' : 'No');
        if (cardPack) row.find('td:eq(4)').text(cardPack);
        row.find('.krt-edit-challenge')
            .data('text', challengeText || row.find('td:eq(2)').text())
            .data('has-bonus', hasBonus !== null ? hasBonus : row.find('.krt-edit-challenge').data('has-bonus'))
            .data('card-pack', cardPack || row.find('.krt-edit-challenge').data('card-pack'));
    }

    // Bulk assign
    $(document).on('submit', '#krt-bulk-assign-form', function(e) {
        e.preventDefault();
        var cardPack = ($('#krt-bulk-card-pack').val() || '').trim();
        var challengeIds = $('.krt-select-challenge:checked').map(function() { return $(this).val(); }).get();

        if (!cardPack) {
            alert('Card pack is required.');
            return;
        }
        if (challengeIds.length === 0) {
            alert('Please select at least one challenge.');
            return;
        }

        $.ajax({
            url: krt_admin_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'krt_bulk_assign_challenges',
                nonce: krt_admin_ajax.bulk_nonce,
                challenge_ids: challengeIds,
                card_pack: cardPack
            },
            success: function(r) {
                if (r.success) {
                    challengeIds.forEach(function(id) {
                        updateChallengeInTable(id, null, null, cardPack);
                    });
                    alert('Card pack assigned to selected challenges.');
                    $('#krt-bulk-card-pack').val('');
                    $('.krt-select-challenge').prop('checked', false);
                    $('#krt-select-all').prop('checked', false);
                } else {
                    alert('Failed to assign: ' + (r.data || 'Unknown error'));
                }
            },
            error: function(xhr) {
                console.error('Bulk assign AJAX error:', xhr);
                alert('An error occurred during bulk assign. See console for details.');
            }
        });
    });

    // Tiny CSS for UX
    const style = document.createElement('style');
    style.textContent = `
        #krt-submit-btn.button-disabled { opacity: .6; cursor: not-allowed; }
        #krt-challenges-table .krt-row-highlight { outline: 2px solid #46b450; outline-offset: -2px; }
    `;
    document.head.appendChild(style);

    // Clear responses
    $('#krt-clear-data').on('click', function() {
        if (!confirm('Are you sure you want to clear all response data? This cannot be undone.')) return;
        $.post(krt_admin_ajax.ajax_url, { action: 'krt_clear_responses', nonce: krt_admin_ajax.clear_nonce }, function(r) {
            if (r && r.success) {
                alert('All response data has been cleared.');
                location.reload();
            } else {
                alert('Failed to clear data: ' + (r && r.data ? r.data : 'Unknown error'));
            }
        });
    });
});
