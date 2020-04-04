var express        = require("express")
    app            = express()
    mongoose       = require("mongoose")
    passport       = require("passport")
    bodyparser     = require("body-parser")
    localStrategy  = require("passport-local")
    methodoverride = require("method-override")
    User           = require("./models/user")
    stash          = require("./models/spellstash")
    

app.set("view engine", "ejs")
app.use(bodyparser.urlencoded({extended: true}))
mongoose.connect("mongodb://localhost:27017/Phaseone", {useUnifiedTopology:true ,useNewUrlParser: true})
app.use(require("express-session")({
    secret: "this is the secret of all spells",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())
passport.use(new localStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())
app.use(methodoverride("_method"))
app.use(express.static("public"))

var server = app.listen(3000, function() {
    console.log("server started")
})

var io             = require("socket.io")(server)
app.get("/", function(req, res) {
    if (req.isAuthenticated()) {
        var truth = {
            logged: true
        }
    } else {
        var truth = {
            logged: false
        }
    }
    console.log(req.user)
    
    res.render("home", {truth: truth})
})

app.get("/home", function(req, res) {
    res.redirect("/")
})

app.get("/signin", function(req, res) {
    res.render("signin", {truth: {logged: false}})
})

app.get("/signup", function (req, res) {  
    res.render("signup", {truth: {logged: false}})
})

app.post("/signup", function (req, res) {  
    User.register(new User({username: req.body.username, first: req.body.firstname, last: req.body.lastname}), req.body.password, function (err, newUser) {  
        if (err) {
            console.log(err)
            res.redirect("/signup")
        }
        else {
            passport.authenticate("local")(req, res, function () {  
                console.log(req.user)
                res.redirect("/")
            })
        }
    })
})

app.post("/signin",passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/signin"
}) ,function (req, res) {  
    console.log("login initiated")
    console.log(req.isAuthenticated())
    console.log(req)
})

app.get("/signout", function (req, res) {  
    req.logout();
    res.redirect("/")
})

var keys = []
app.get("/:key/dungeon", function (req, res) {
    if (req.isAuthenticated()) {
        var info = {
            nametwo : "Opponent",
            nameone: req.user.username,
            nature: 1,
            key : req.params.key
        }
        res.render("arena", {info: info})
    }  else {
        res.redirect("/signin")
    }
    
})

app.get("/:key/dungeoner", function(req, res) {
    if (req.isAuthenticated()) {
        var info = {
            nameone : "Opponent",
            nametwo: req.user.username,
            nature: 2,
            key : req.params.key
        }
        res.render("arena", {info: info})
    }  else {
        res.redirect("/signin")
    }
})



app.get("/matchfind", function(req, res) {
    if (req.isAuthenticated()) {
        var truth = {
            logged: true
        }
        res.render("matchfind", {truth: truth})
    } else {
        var truth = {
            logged: false
        }
        res.redirect("/signin")
    }
    
})

app.post("/matchfind", function(req, res) {
    if (keys.indexOf(req.body.key)!= -1){
    res.redirect("/"+req.body.key+"/dungeoner")
    } else {
        res.redirect("/matchfind")
    }
})

app.get("/matchmake", function(req, res) {
    if (req.isAuthenticated()) {
        var truth = {
            logged: true
        }
        res.render("matchmake", {truth: truth})
    } else {
        var truth = {
            logged: false
        }
        res.redirect("/signin")
    }
    
})

app.post("/matchmake", function(req, res) {
    keys.push(req.body.key)
    res.redirect("/"+req.body.key+"/dungeon")
})


io.on('connection', (socket) => {
    console.log('New User connected')
    socket.on('new-move', (data) => {
        //console.log(data.move)
        io.sockets.emit('new-move', {move : data.move, user : data.user, key : data.key})
    })
    socket.on('interact', (data) => {
        if (data.type ==='fire') {
            io.sockets.emit('interact', {  dmg: 75, affect : data.affect, key : data.key})
        } else if (data.type ==='water') {
            io.sockets.emit('interact', { dmg: 30, affect : data.affect, key : data.key})
        }
    })
    socket.on('spellcast', (data) => {
        console.log(data.spell)
        io.sockets.emit('spellcast', {caster : data.user, spell : data.spell, key : data.key})
    })

})
function healthy(spell) {
    var brk = spell.split(" ")
    var num = brk.indexOf("heal")
    var health;
    var energy;
    if (num>0) {
        boostword = brk[num-1]
        switch (boostword) {
                         case "first":
                             health = 5
                             energy = 7
                         break;
                         case "second":
                             health = 8
                             energy = 13
                         break;
                         case "third":
                             health = 12
                             energy = 19
                         break;
                         case "fourth":
                             health = 17
                             energy = 26
                         break;
                         case "fifth":
                             health = 23
                             energy = 37
                         break;
                         case "sixth":
                             health = 30
                             energy = 49
                         break;
                    
                         default:
                             health = 0
                             energy = 0
                             break;
                     }
                     return [health, energy]
    }
    return [0,0]
}
function dmges(spell) {
    var brk = spell.split(" ")
    var num = brk.indexOf("attack")
    var damage;
    var energy;
    if (num>0) {
        boostword = brk[num-1]
        switch (boostword) {
            case "first":
                damage = 10
                energy = 7
            break;
            case "second":
                damage = 13
                energy = 11
            break;
            case "third":
                damage = 17
                energy = 15
            break;
            case "fourth":
                damage = 22
                energy = 19
            break;
            case "fifth":
                damage = 28
                energy = 25
            break;
            case "sixth":
                damage = 35
                energy = 31
            break;
       
            default:
                damage = 0
                energy = 0
                break;
        }
        return [damage, energy]
    }
    return [0,0]
}





