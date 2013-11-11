var moonshine = require("moonshine-js"),
    crypto = require("crypto"),
    settings = moonshine.settings,
    logger = moonshine.logFactory()



module.exports.setup = function(cb){
    moonshine.user.rememberme = {
        shouldRemember: DefaultShouldRemember
    }
    var express = moonshine.server.native
    var app = moonshine.server.app;
    app.configure(function(){
        app.use(handle);
    })
    cb()
}

function DefaultShouldRemember(req) {
    return req.body && req.body.rememberme;
}
function handle(req,res,next) {
    overrideLogout(req)
    if(req.isAuthenticated()) return next()
    //add user from token
    var shouldRemember = moonshine.user.rememberme.shouldRemember(req)
    if (shouldRemember) {
        req.session._moon_user_remember_me_requested = true;
    }
    if (req.session._moon_user_remember_me_requested) {
        var orgLogin = req.logIn;
        req.logIn = req.login = function(user){
            var loginArgs = arguments
            req.session._moon_user_remember_me_requested = undefined;
            addNewToken(user,res,null,function(){
                //we never throw exceptions if we failed to remember me
                orgLogin.apply(req,Array.prototype.slice.call(loginArgs,0))
            });
        }
    }
    authenticateUserFromToken(req,res,next)
}

function addNewToken(user,res,prevToken,cb) {
    crypto.randomBytes(settings.USER_REMEMBERME_TOKEN_BYTE_STRENGTH,function(err,buf){
        if(err) {
            logger.error("failed to generate random bytes",user.id,{user:user.id});
            return cb(err)
        }
        var token = buf.toString('hex')
            , expires = new Date(Date.now() + settings.USER_REMEMBERME_TOKEN_EXPIRE_DAYS);
        var updateClause = {}
        updateClause[settings.USER_REMEMBERME_MODEL_TOKENS_KEYNAME + "." + token] = {
            expires: expires,
            created: new Date(Date.now())
        }
        if (prevToken) {
            updateClause.$unset = {}
            updateClause.$unset[settings.USER_REMEMBERME_MODEL_TOKENS_KEYNAME + "." + prevToken] = true
        }
        moonshine.db.models.User.update({_id:user.id},updateClause,{strict:false},function(err) {
            if (err) {
                logger.error("error while updating user token",err,{token:token,user:user.id})
                cb(err)
            }
            res.cookie(settings.USER_REMEMBERME_TOKEN_NAME, { user: user._id,
                    token: token
                }
                , {
                    expires: expires,
                    httpOnly: true,
                    secure: settings.USER_REMEMBERME_SECURE_ONLY,
                    signed: true
                }
            );
            cb()
        })
    })
}
function overrideLogout(req) {
    req.__passportLogout = req.logout;
    req.logout = req.logOut = logoutRemoveRM
}
function logoutRemoveRM() {
    var token = this.signedCookies[settings.USER_REMEMBERME_TOKEN_NAME]
    if (token && token.user) {
        var user = this[settings.USER_REQUEST_PROPERTY_NAME]
        if (user.id == token.user) {
            var updateClause = {}
            updateClause[USER_REMEMBERME_MODEL_TOKENS_KEYNAME + ".$." + token.token] = 1
            user.update({$unset:updateClause},function(err){
                logger.error("failed to delete token after user loggedout",err,{user:user.id,token:token})
            })
        }
    }
    this.__passportLogout();
}

function authenticateUserFromToken(req,res,cb) {
    var token = req.signedCookies[settings.USER_REMEMBERME_TOKEN_NAME]
    if (token) {
        var tokenCheckClause = {_id: token.user}
        tokenCheckClause[settings.USER_REMEMBERME_MODEL_TOKENS_KEYNAME + "." + token.token] ={$exists:true}
        moonshine.db.models.User.findOne(tokenCheckClause,function(err,user){
            if (err) {
                logger.error("got error trying to login user with token",err,{user:token.user,token:token.token})
                return cb()
            }
            if (!user) {
                logger.warn("someone tried to log in with bad token",{user:token.user,token:token.token})
                res.clearCookie(settings.USER_REMEMBERME_TOKEN_NAME)
                cb()
            }
            addNewToken(user,res,token.token,function(err) {
                if (err) cb() //we don't populate errors, the user will receive unauthorized if necessary
                req.login(user,cb)
            })

        })
    } else {
        cb()
    }

}