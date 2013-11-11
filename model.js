var moonshine = require("moonshine-js"),
	Schema = moonshine.db.Schema,
    settings = moonshine.settings

var User = moonshine.db.getSchema("User")
var tokensField = {}
tokensField[settings.USER_REMEMBERME_TOKEN_NAME]  = {type:Schema.Types.Mixed,select:false}
User.add(tokensField)