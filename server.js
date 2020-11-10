//call the packages
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var User = require('./app/models/user.js');
var port = process.env.port || 8080; //set the port for our application
var jwt = require('jsonwebtoken');
var superSecret = 'toihocmean';

//App configuration
//use body-parser so we can grab information from POST requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//configure our app to handle CORS policy
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
    next();
});

//log all request to the console
app.use(morgan('dev'));

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1:27017/mydata', { userNewUrlParser: true });
mongoose.set('useCreateIndex', true);
//Routes for our api
//basic router for the homepage 
app.get('/', function (req, res) {
    res.send('Welcome to the home page!');
});

//get an instance of the express router
var apiRouter = express.Router();

//route to authenticate a user (POST http://localhost:8080/appi/authenticate)
apiRouter.post('/authenticate', function (req, res) {
    User.findOne({
        username: req.body.username
    }).select('name username password').exec(function (err, user) {
        if (err) throw err;
        if (!user) {
            res.json({
                success: false,
                message: 'Authentication failed. User not found !'
            });
        } else if (user) {
            var validPassword = user.comparePassword(req.body.password);
            if (!validPassword) {
                res.json({
                    success: false,
                    message: 'Authentication failed. Wrong password !'
                });
            } else {
                console.log('ABC ABC ABC');
                var token = jwt.sign({
                    name: user.name,
                    username: user.username
                }, superSecret, {
                    expiresIn: '24h'
                });
                res.json({
                    success: true,
                    message: 'Lam viec voi token !',
                    token: token
                });
            }
        }
    });
});

//middleware - application middleware
apiRouter.use(function (req, res, next) {
    console.log('Dang lam tren App !');
    // next();

    //check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    //decode token
    if (token) {
        jwt.verify(token, superSecret, function (err, decoded) {
            if (err) {
                return res.json({
                    success: false,
                    message: 'Failed to authenticate token !'
                });
            }
            else {
                //if everything is good, save to request for use in other router
                req.decoded = decoded;
                next(); //make sure we go to the next routes and dont stop here
            }
        })
    }
    else {
        //if there is no token 
        //return an HTTP response of 403 (access forbiden) and an error message
        return res.status(403).send({
            success: false,
            message: 'No token provided !'
        });
    }
});

//test route to make sure everything is working
//accessed at GET https://localhost:8080/api
apiRouter.get('/', function (req, res) {
    res.json({ message: 'This is an example about api.' });
});

apiRouter.route('/users')
    .post(function (req, res) {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function (err) {
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.' });
                else
                    return res.send(err);
            }

            res.json({ message: 'User created!' });
        });
    })
    .get(function (req, res) {
        User.find(function (err, users) {
            if (err) return res.send(err);
            res.json(users);
        });
    });
apiRouter.route('/users/:user_id')
    .get(function (req, res) {
        User.findById(req.params.user_id, function (err, user) {
            if (err) return res.send(err);
            res.json(user);
        });
    })
    .delete(function (req, res) {
        User.remove({
            _id: req.params.user_id
        }, function (err, user) {
            if (err) return res.send(err);
            res.json({ message: 'Successfully deleted' });
        });
    })
    .put(function (req, res) {
        User.findById(req.params.user_id, function (err, user) {
            if (err) return res.send(err);
            if (req.body.name) user.name = req.body.name;
            if (req.body.username) user.username = req.body.username;
            if (req.body.password) user.password = req.body.password;

            user.save(function (err) {
                if (err) return res.send(err);
                res.json({ message: 'User updated!' });
            });
        });
    })

//Register our Router 
//all of our router will be prefixed with /api
app.use('/api', apiRouter);

//START the SERVER
app.listen(port);
console.log('The port we need to use : ' + port);