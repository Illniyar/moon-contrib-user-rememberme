module.exports.config = function(settings) {

	settings.USER_REMEMBERME_SECURE_ONLY = false;
    settings.USER_REMEMBERME_TOKEN_NAME = "rmToken"
    settings.USER_REMEMBERME_TOKEN_EXPIRE_DAYS = 90000
    settings.USER_REMEMBERME_TOKEN_BYTE_STRENGTH = 20
    settings.USER_REMEMBERME_MODEL_TOKENS_KEYNAME = "rmTokens"

    settings.middleware.push(require.resolve("./middleware"))
}
