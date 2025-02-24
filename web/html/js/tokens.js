$(window).load(function() {
    $(document).on('keyup', '.token-text input[type=text]', function(e) {
        //TODO: Support data-token-types field

        // Locate tokens in text field
        const textField = $(e.target);
        let text = textField.val();

        const matches = text.match(/((\w|-|\.)+,)/);

        if (matches && matches.length > 1) {
            let tokenName = matches[1];
            addToken(tokenName, textField);
        }
    });

    $(document).on('blur', '.token-text input[type=text]', function(e) {
        //TODO: Support data-token-types field

        // Locate tokens in text field
        const textField = $(e.target);
        let text = textField.val();

        if (text.length > 0) {
            addToken(text, textField);
        }
    });

    $(document).on('click', '.token-text .token .delete', function(e) {
        deleteToken($(e.target));
    });

    function addToken(tokenName, textField)
    {
        if (tokenName.length === 0) return;

        textField.val(textField.val().replace(tokenName,''));

        tokenName = tokenName.split(',').join('').trim();

        if (tokenName.length > 0) {
            $('<li class="token">' + tokenName + '<div class="delete"></div></li>').insertBefore(textField.parent());

            rebuildTokens(textField);
        }
    }

    function rebuildTokens(parent)
    {
        if (!parent.is('ul.token-text')) {
            parent = parent.closest('ul.token-text')
        }

        // Find hidden input field
        const input = parent.find('input[type=hidden]');
        input.val(getTokens(parent).join(','));
    }

    function getTokens(parent)
    {
        if (!parent.is('ul.token-text')) {
            parent = parent.closest('ul.token-text')
        }

        const tokens = [];

        parent.find('li.token').each(function(index) {
            tokens.push(strip_html_tags($(this).html()));
        });

        console.log(tokens);

        return tokens;
    }

    function deleteToken(obj)
    {
        let token = obj;

        if (!obj.is('li.token')) {
            token = obj.closest('li.token')
        }

        const parent = token.closest('ul.token-text')

        token.remove();

        rebuildTokens(parent);
    }
});