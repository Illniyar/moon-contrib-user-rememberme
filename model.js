var moonshine = require("moonshine-js"),
	Schema = moonshine.persistence.Schema,
    settings = moonshine.settings

var User = moonshine.persistence.getSchema("User")
var tokensField = {}
tokensField[settings.USER_REMEMBERME_TOKEN_NAME]  = {type:Schema.Types.Mixed,select:false}
User.add(tokensField)