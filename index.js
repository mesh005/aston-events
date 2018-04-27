const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const passport = require ('passport');
const config = require('./config/database');
var port = process.env.PORT || 3000;


//connect to database
mongoose.connect(config.database)
let db = mongoose.connection;

db.once('open',function(){
  console.log('Connected to MongoDB');
})

//check for db errors
db.on('error',function(err){
  console.log(err);
});

//init app
const app = express();

//bring in models
let Event = require('./models/events');
let User = require('./models/user');


//Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine','pug')

//body parser middleware
app.use(bodyParser.urlencoded({ extended:false}))
app.use(bodyParser.json())


//Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));

//Express Session middleware
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
}));

//Express Messages middleware
    app.use(require('connect-flash')());
    app.use(function (req,res, next) {
      res.locals.messages = require('express-messages')(req, res);
      next();
    });

//Express Validator middleware
app.use(expressValidator({
  errorFormatter: function(param, msg, value){
    var namespace = param.split('.')
    , root = namespace.shift()
    , formParam = root;

    while(namespace.length){
      formParamn += '[' + namespace.shift() + ']'
    }

    return {
       param : formParam,
       msg : msg,
       value: value

    };
  }
}));

//Passport config
require('./config/passport')(passport);
//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next){
  res.locals.user = req.user || null;
  next();
});

//Access control
    function ensureAuthenticated(req, res, next){
      if(req.isAuthenticated()){
        return next();
      } else{
        req.flash('danger', 'Please login');
        res.redirect('/');
      }
    }

//home route
app.get('/', function(req,res){
  var collection = db.collection('events')
  collection.find({}).toArray (function(err, result){
    if(err){
      console.log(err);
    }
    else{

      res.render('homepage',{
        title: 'Aston Events',
        events: result
      });
    };
  })
  });

//Get a single event
  app.get('/events/:id', function(req,res){
    Event.findById(req.params.id, function(err, result){
      User.findById(result.organiser, function(err, user){
        res.render('events',{
      result:result,
      email: user.email,
      host: user.username

    })
      });
      });
    });


    //Get sporting events
      app.get('/category/1', function(req,res){
      var collection = db.collection('events')
      collection.find({event_category:'Sport'}).toArray (function(err, result){
        if(err){
          return err;
              }else{
          res.render('sortedEvents',{
          title: 'Sport',
          events: result
              });
                }
                });
              }
            );

      //Get culture events
        app.get('/category/2', function(req,res){
        var collection = db.collection('events')
        collection.find({event_category:'Culture'}).toArray (function(err, result){
          if(err){
              return err;
                }else{
              res.render('sortedEvents',{
              title: 'Cultural',
              events: result
                });
                }
                });
                  }
                );

//Get other events
app.get('/category/3', function(req,res){
var collection = db.collection('events')
collection.find({event_category:'Other'}).toArray (function(err, result){
if(err){
  return err;
      }else{
      res.render('sortedEvents',{
          title: 'Other',
          events: result
            });
                }
              });
            }
        );
//Get events sorted by date
        app.get('/category/upc', function(req,res){
        var collection = db.collection('events')
        collection.find().sort({date:1}).toArray (function(err, result){
                  if(err){
                  return err;
                  }else{
            res.render('sortedEvents',{
                title: 'Up and coming',
                  events: result
                    });
                          }
                          });
                        }
                      );

  //Get events sorted by likes
  app.get('/category/pop', function(req,res){
  var collection = db.collection('events')
  collection.find().sort({__v:-1}).toArray (function(err, result){
  if(err){
      return err;
          }else{
        res.render('sortedEvents',{
          title: 'Most popular',
          events: result
                    });
                        }
                        });
                      }
                    );



//Add register route
app.get('/register', function(req,res){
  res.render('registerpage',{

  }
);
});

//Add register post route
app.post('/register', function(req,res){
 const username = req.body.username;
 const email = req.body.email;
 const password = req.body.password;
 const password2 = req.body.password2;

 req.checkBody('username', 'A username is required').notEmpty();
 req.checkBody('email', 'An email address is required').notEmpty();
 req.checkBody('email', 'Email is not valid').isEmail();
 req.checkBody('password', 'Password is required').notEmpty();
 req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

 let errors = req.validationErrors();

 if(errors){
   res.render('registerpage',{
     errors:errors
   });
 } else{
   let newUser = new User({
     username:username,
     email:email,
     password:password
   });

   bcrypt.genSalt(10, function(err, salt){
   bcrypt.hash(newUser.password, salt, function(err,hash){
     if(err){
       console.log(err);
     }
     newUser.password = hash;
     newUser.save(function(err){
       if(err){
         console.log(err);
         return;
       }
      else{
       req.flash('success','You are now registered and can log in');
       res.redirect('/');
     }
   })
   })
 }
   );
 }
});


//Login Process
app.post('/login',function(req,res, next){
  passport.authenticate('local',{
    successRedirect:'/',
    failureRedirect:'/',
    failureFlash: true
  })(req, res, next) ;
});

//logout
app.get('/logout', function(req, res){
  req.logout();
  req.flash('success','You are logged out.');
  res.redirect('/');
})

//Add create event route
app.get('/create', ensureAuthenticated, function(req,res){
  res.render('addEvent',{

  }
);
});

//Add create event POST Route
app.post('/create', function(req,res){
req.checkBody('event_category','You need to select an event').notEmpty();
req.checkBody('event_name','Event name is required').notEmpty();
req.checkBody('location','Location is required').notEmpty();
req.checkBody('description','Description is required').notEmpty();
req.checkBody('date','Date is required').notEmpty();

//Get errors
let errors= req.validationErrors();

if(errors){
  res.render('addEvent',{
    errors:errors
  });
}
else{
  let events = new Event();
  events.event_category= req.body.event_category
  events.event_name= req.body.event_name
  events.location= req.body.location
  events.description= req.body.description
  events.date= req.body.date
  events.organiser=req.user._id;

  events.save(function(err){
    if(err){
      console.log(err);
    }
    else{
      req.flash('success','Event Added');
      res.redirect('/');
    }
  })
}
  }
);



//Edit event POST Route
app.post('/events/edit/:id', function(req,res){
let events = {};
events.event_category= req.body.event_category
events.event_name= req.body.event_name
events.location= req.body.location
events.description= req.body.description
events.date= req.body.date
let query = {_id:req.params.id}

Event.update(query, events, function(err){
  if(err){
    console.log(err);
  }
  else{
    req.flash('success','Event Updated');
    res.redirect('/');
  }
})
  }
);


//Get a single event
  app.get('/events/:id', function(req,res){
    Event.findById(req.params.id, function(err, result){
      User.findById(result.organiser, function(err, user){
        res.render('events',{
      result:result,
      email: user.email,
      host: user.username

    })
      });
      });
    });
//Like a single event
app.post('/like/:id',function(req,res){
  Event.findById(req.params.id, function(err, theUser){
    if(err){
      console.log(err);
    }
    else{
      theUser.__v += 1;
      theUser.save();
      res.redirect('/');
      }
})

});


//Load Edit form
  app.get('/events/edit/:id', ensureAuthenticated, function(req,res){
    Event.findById(req.params.id, function(err, result){
      if(result.organiser != req.user._id){
        req.flash('danger', 'Not Authorized');
        res.redirect('/');
      }
        res.render('edit_event',{
      result:result
        }
      );
      });
    });



//start server
app.listen(port, function(){
  console.log("Server started on port 3000");
})
