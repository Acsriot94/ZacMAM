$(document).ready(function() {
    $(".share-recipient-list").each(function(index) {
        $(this).accordion({
            collapsible: true,
            active: false,
            heightStyle: "content"
        });
    });

    // Nudge
    $(document).on("click",".nudge", function(e) {
        var obj = $(this);
        var user_id = obj.data("id");

        if (!user_id) {
            alert("Unable to get recipient ID.");
            return;
        }

        $.post("include/nudge.php",{linknudge:user_id}, function(data) {
            if (data == "OK") {
                obj.addClass("nudge-sent");
                obj.removeClass("nudge");
                $(e.target).attr("title","Nudge sent");
            } else {
                alert("Unable to nudge user. This user may not have permission to view this file.");
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to nudge user: " + errorString));
        });
    });

    // Context menu
    $("#sharelinktable tr, #shareuploadstable tr").bind("contextmenu", function(event) {
        // Don't show menu over text fields
        if (event.target.tagName.toLowerCase() === "input" || event.target.tagName.toLowerCase() === "textarea") return;

        event.preventDefault();
        var menuCopy = $("#share_dropdown_"+$(this).data("link-id")).clone();

        menuCopy.appendTo("body");
        menuCopy.show().menu().css({position:"absolute", top: event.pageY + "px", left: event.pageX + "px", maxWidth: "200px"});
    });

    const actionsBtn = document.getElementById('actions-btn');
    actionsBtn.addEventListener('click', function(e) {
        showMenuForButton($(actionsBtn), $('#actions_dropdown'));
    });

});

function shareDropdownClicked(obj,link_id) {
    $("#share_dropdown_"+link_id).show().menu();
}

function toggleShareLinkStats(link_id)
{
    var obj = $('.share-stats[data-link-id="' + link_id + '"]');

    if (obj.length) {
        hideShareLinkStats(link_id);
    } else {
        showShareLinkStats(link_id);
    }
}

function showShareLinkStats(link_id)
{
    // Find parent row
    var parent = $('#sharelinktable tr[data-link-id="' + link_id + '"]');

    if (!parent.length) {
        alert("Unable to locate link row.");
        return;
    }

    var statsRow = $('<tr class="share-stats" data-link-id="' + link_id + '">' +
        '<td colspan="8">' +
        '<center><img src="img/spinner-white.svg"/></center></td></tr>');

    statsRow.insertAfter(parent);

    var params = {link_id: link_id, project_id: getCurrentProjectID()};

    $.post("ajax/share.php?stats", params, function(json) {
        if (json['error']) {
            alert(sanitize_string(json['error']));
        } else {
            var recipients = json["recipients"];
            var innerHTML = '';

            if (recipients.length === 0) {
                innerHTML += 'No views or recipients';
            } else {
                var template = $("#share-link-stats-template").html();
                template = template.replace("u.truncate", "truncate");
                const twig = Twig.twig({ data: template });

                for (var i=0; i < recipients.length; i++) {
                    innerHTML += twig.render(recipients[i]);
                }
            }

            statsRow.find("td").html(innerHTML);
            reloadTooltips();
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to display stats: " + errorString));
    });
}

function hideShareLinkStats(link_id)
{
    var row = $('tr.share-stats[data-link-id="' + link_id + '"]');

    if (row.length) {
        row.remove();
    }
}

function toggleUploadStats(link_id)
{
    var obj = $('.share-upload-stats[data-link-id="' + link_id + '"]');

    if (obj.length) {
        hideUploadStats(link_id);
    } else {
        showUploadStats(link_id);
    }
}

function showUploadStats(link_id)
{
    // Find parent row
    var parent = $('#shareuploadstable tr[data-link-id="' + link_id + '"]');

    if (!parent.length) {
        alert("Unable to locate link row.");
        return;
    }

    var statsRow = $('<tr class="share-upload-stats" data-link-id="' + link_id + '">' +
        '<td colspan="8">' +
        '<center><img src="img/spinner-white.svg"/></center></td></tr>');

    statsRow.insertAfter(parent);

    var params = {link_id: link_id, project_id: getCurrentProjectID()};

    $.post("ajax/share.php?uploadstats", params, function(json) {
        if (json['error']) {
            alert(sanitize_string(json['error']));
        } else {
            var recipients = json["recipients"];
            var innerHTML = '';

            if (recipients.length === 0) {
                innerHTML += 'No views or recipients';
            } else {
                var template = $("#share-upload-stats-template").html();
                template = template.replace("u.truncate", "truncate");
                const twig = Twig.twig({ data: template });

                for (var i=0; i < recipients.length; i++) {
                    innerHTML += twig.render(recipients[i]);
                }
            }

            statsRow.find("td").html(innerHTML);
            reloadTooltips();
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to display stats: " + errorString));
    });
}

function hideUploadStats(link_id)
{
    var row = $('tr.share-upload-stats[data-link-id="' + link_id + '"]');

    if (row.length) {
        row.remove();
    }
}

function fileLinkClick(e)
{
    if (e.ctrlKey || e.metaKey) {
        // Go to player / files page
        window.location.href = e.target.getAttribute("data-url");
    } else {
        // Filter Share list for this file
        window.location.href = "share?filter_file_id=" + e.target.getAttribute("data-file-id");
    }
}

function isSharedLinksTabSelected()
{
    return document.querySelector("li.ui-tabs-active a[href=\"#share-tab-links\"]") !== null;
}

function deleteExpiredLinks()
{
    $(".menu").hide();

    // Check if it's on the Shared Links or File Requests tab
    const isSharedLinks = isSharedLinksTabSelected();

    const projectID = getCurrentProjectID();
    let params = {shared_links: isSharedLinks, project_id: projectID};

    if (confirm("Are you sure you wish to delete all expired " + (isSharedLinks ? "shared links" : "upload requests") + "?")) {
        $.post("ajax/share.php?delete-expired", params, function(json) {
            if (json['error']) {
                alert(sanitize_string(json['error']));
            } else {
                const search = new URLSearchParams(window.location.search);
                search.delete('upload_requests');
                if (!isSharedLinks) search.append("upload_requests", "");
                const searchString = search.toString();

                if (window.location.search !== searchString) {
                    window.location.href = "share" + (searchString !== "" ? "?" : "") + search.toString();
                } else {
                    window.location.reload();
                }
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to delete links: " + errorString));
        });
    }
}

function deleteAllLinks()
{
    $(".menu").hide();

    // Check if it's on the Shared Links or File Requests tab
    const isSharedLinks = isSharedLinksTabSelected();

    const projectID = getCurrentProjectID();
    let params = {shared_links: isSharedLinks, project_id: projectID};

    if (confirm("Are you sure you wish to delete all " + (isSharedLinks ? "shared links" : "upload requests") + "?")) {
        $.post("ajax/share.php?delete-all", params, function(json) {
            if (json['error']) {
                alert(sanitize_string(json['error']));
            } else {
                const search = new URLSearchParams(window.location.search);
                search.delete('upload_requests');
                if (!isSharedLinks) search.append("upload_requests", "");
                const searchString = search.toString();

                if (window.location.search !== searchString) {
                    window.location.href = "share" + (searchString !== "" ? "?" : "") + search.toString();
                } else {
                    window.location.reload();
                }
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to delete links: " + errorString));
        });
    }
}