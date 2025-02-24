function validateEmail(email) {
    return (email.indexOf('@') > -1 && email.indexOf('.') > -1 && email.indexOf('@kollaborate.tv') == -1 && email.indexOf('@kollaborate.tv') == -1);
}

function cleanupEmail(email) {
    email = $.trim(email);

    if (email.length > 1) {
        var lastChar = email.substr(-1);

        if (lastChar == '.' || lastChar == ',' || lastChar == '@' || lastChar == ';' || lastChar == ')' || lastChar == '>' || lastChar == '"' || lastChar == "'")
            email = email.substr(0, email.length - 1);
    }

    if (email.length > 1) {
        var firstChar = email.substr(0,1);

        if (firstChar == '.' || firstChar == ',' || firstChar == '@' || firstChar == ';' || firstChar == ')' || firstChar == '<')
            email = email.substr(1);
    }

    if (email.length > 7 && email.substr(0,7) == 'mailto:')
        email = email.substr(7);

    email = $.trim(email);

    return email;
}