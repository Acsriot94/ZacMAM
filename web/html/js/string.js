function formatTextBody(body, convert_urls)
{
    if (!body || typeof body === 'undefined') return '';

    // Convert URLs into hrefs
    if (convert_urls) {
        // http://, https://
        var urlPattern = /\b(?:https?):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;

        // www. sans http:// or https://
        var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

        // Email addresses
        var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;

        body = body.replace(urlPattern, function(match, p1, p2, offset, string) {
            match = sanitize_url(match);
            return '<a href="' + match + '" target="_blank">' + match + '</a>';
        })
            .replace(pseudoUrlPattern,  function(match, p1, p2, offset, string) {
                p1 = sanitize_url(p1);
                p2 = sanitize_url(p2);

                return p1 + '<a href="http://' + p2 + '" target="_blank">' + p2 + '</a>';
            })
            .replace(emailAddressPattern, function(match, p1, p2, offset, string) {
                match = sanitize_url(match);
                return '<a href="mailto:' + match + '" target="_blank">' + match + '</a>';
            });
    }

    // Format body with proper line spaces
    body = body.replace(/\n/g,'<br>')
               .replace(/\r/g,'<br>')
               .replace(/<br><br>/g,'<p>')
               .replace(/\\/g,'');

    return body;
}

//TEMP until comment component is available
function stripUserTags(text) {
    text = text.replaceAll('&nbsp;', '');

    let output = '';

    let lastPos = 0;
    let tagStart = text.indexOf('|TAG:');

    while (tagStart >= 0) {
        output += text.substring(lastPos, tagStart);

        // Get tag end
        let tagEnd = text.indexOf(':TAG|', tagStart);
        if (tagEnd < 0) return text;

        const tag = JSON.parse(text.substring(tagStart + 5, tagEnd));
        output += `${tag.name}`;

        lastPos = tagEnd + 5;
        tagStart = text.indexOf('|TAG:', lastPos);
    }

    output += text.substring(lastPos);
    return output;
}