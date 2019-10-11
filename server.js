var express = require("express");
	var exphbs = require('express-handlebars');
	var mongoose = require("mongoose");
	var path = require('path');
	

	// Our scraping tools
	// Axios is a promised-based http library, similar to jQuery's Ajax method
	// It works on the client and on the server
	var axios = require("axios");
	var cheerio = require("cheerio");
	

	// Require all models
	var db = require("./models");
	

	// Initialize Express
	var app = express();
	

	var PORT = process.env.PORT || 3000;
	

	// Configure middleware
	app.use(express.urlencoded({ extended: true }));
	// Parse request body as JSON
	app.use(express.json());
	// Make public a static folder
	app.use(express.static("public"));
	

	app.engine("handlebars", exphbs({ defaultLayout: "main" }));
	app.set("view engine", "handlebars");
	app.set('index', __dirname + '/views');
	

	// Hook mongoose configuration to the db variable
	var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
	mongoose.connect(MONGODB_URI, { useNewUrlParser: true });
	

	//ROUTES
	

	// A GET route for scraping the echoJS website
	app.get("/", function (req, res) {
	  db.Article.find({ saved: false }, function (err, result) {
	      if (err) throw err;
	      res.render("index", {result})
	  })
	});
	

	app.get("/scrape", function(req, res) {
	  // First, we grab the body of the html with axios
	  axios.get("https://www.nytimes.com/section/technology/").then(function(response) {
	    // Then, we load that into cheerio and save it to $ for a shorthand selector
	    var $ = cheerio.load(response.data);
	

	    // Now, we grab every h2 within an article tag, and do the following:
	    $("div").each(function(i, element) {
	      // Save an empty result object
	      var result = {};
	      var link = "https://www.nytimes.com/";
	

	      // Add the text and href of every link, and save them as properties of the result object
	      result.title = $(this)
	      .children("h2")
	      .text()
	      .trim()
	      result.link = link + $(this)
	      .children("h2")
	      .find("a")
	      .attr("href");
	      result.summary = $(this)
	      .find("p")
	      .text()
	      .trim();
	

	      // Create a new Article using the `result` object built from scraping
	      db.Article.create(result)
	        .then(function(dbArticle) {
	          // View the added result in the console
	          console.log(dbArticle);
	        })
	        .catch(function(err) {
	          // If an error occurred, log it
	          console.log(err);
	        });
	    });
	

	    // Send a message to the client
	    res.send("Scrape Complete");
	  });
	});
	

	// Route for getting all Articles from the db
	app.get("/articles", function(req, res) {
	  // Grab every document in the Articles collection
	  db.Article.find({})
	    .then(function(dbArticle) {
	      // If we were able to successfully find Articles, send them back to the client
	      res.json(dbArticle);
	    })
	    .catch(function(err) {
	      // If an error occurred, send it to the client
	      res.json(err);
	    });
	});
	

	// Route for grabbing a specific Article by id, populate it with it's note
	app.get("/articles/:id", function(req, res) {
	  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
	  db.Article.findOne({ _id: req.params.id })
	    // ..and populate all of the notes associated with it
	    .populate("note")
	    .then(function(dbArticle) {
	      // If we were able to successfully find an Article with the given id, send it back to the client
	      res.json(dbArticle);
	    })
	    .catch(function(err) {
	      // If an error occurred, send it to the client
	      res.json(err);
	    });
	});
	

	// Route for saving/updating an Article's associated Note
	app.post("/articles/:id", function(req, res) {
	  // Create a new note and pass the req.body to the entry
	  db.Note.create(req.body)
	    .then(function(dbNote) {
	      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
	      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
	      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
	      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
	    })
	    .then(function(dbArticle) {
	      // If we were able to successfully update an Article, send it back to the client
	      res.json(dbArticle);
	    })
	    .catch(function(err) {
	      // If an error occurred, send it to the client
	      res.json(err);
	    });
	});
	

	// get article by ObjectId
	app.get('/articles/:id', function(req, res) {
	  db.Article.findOne({ _id: req.params.id })
	  .then(function(dbArticle) {
	      res.json(dbArticle);
	  })
	  .catch(function(err) {
	      res.json(err);
	  });
	});
	

	// Save Article
	app.post('/save/:id', function(req, res) {
	  db.Article.findByIdAndUpdate(req.params.id, {
	      $set: { saved: true}
	      },
	      { new: true },
	      function(error, result) {
	          if (error) {
	              console.log(error);
	          } else {
	              res.redirect('/');
	          }
	      });
	});
	

	// get saved articles
	app.get("/saved", function (req, res) {
	  var savedArticles = [];
	  db.Article.find({ saved: true }, function (err, saved) {
	      if (err) throw err;
	      savedArticles.push(saved)
	      res.render("saved", { saved })
	  })
	});
	

	// delete Article
	app.post('/delete/:id', function(req, res) {
	  db.Article.findByIdAndUpdate(req.params.id, {
	      $set: { saved: false, deleted: true}
	      
	      },
	      { new: true },
	      function(error, result) {
	          if (error) {
	              console.log(error);
	          } else {
	              res.redirect('/saved');
	          }
	      });
	});
	

	app.post("/notes/save/:id", function (req, res) {
	  // Create a new note 
	  var newNote = new Note({
	      body: req.body.text,
	      article: req.params.id
	  });
	

	  // Save note to db
	  newNote.save(function (error, note) {
	      if (error) {
	        console.log(error);
	      }
	      else {
	        Article.findOneAndUpdate({ "_id": req.params.id }, { $push: { "notes": note } })
	          .exec(function (err) {
	              if (err) {
	                  console.log(err);
	                  res.send(err);
	              }
	              else {
	                  res.send(note);
	              }
	          });
	      }
	  });
	});
	

	// Server Listening
	app.listen(PORT, function() {
	    console.log("App running on port " + PORT);
	  });



// var express = require("express");
// var logger = require("morgan");
// var mongoose = require("mongoose");
// var path = require("path");



// //requiring note models
// var Note = require(".models/Note.js");
// var Article = require("./models/Article.js")
// // Scraping tools

// var axios = require("axios");
// var cheerio = require("cheerio");

// // Require all models
// var db = require("./models");

// // Initialize Express
// var app = express();

// var PORT =process.env.PORT || 3000;

// // Configure middleware

// // Use morgan logger for logging requests
// app.use(logger("dev"));
// // Parse request body as JSON
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// // Make public a static folder
// app.use(express.static("public"));

// // Connect to the Mongo DB
// app.engine("handlebars", exphbs({ defaultLayout: "main",
// partialsDir:path.join(_dirname, "views/layouts/partials")
// }));
// app.set("view engine", "handlebars");
// app.set("index", __dirname + "/views")

// var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
//     mongoose.connect(MONGODB_URI, {useNewUrlParser: true});

// var db = mongoose.connection;

// //show any connection errors
// db.on("error,", function(error){
//     console.log("Mongoose COnnection Error:", error);
// });

// // after login oked show ok message
// db.once("ready", function(){
//     console.log("Connection Success");
// })

// // // Routes

// app.get("/", function(req,res){
//     Article.find({saved: false}, function(error, ){
//     var hbsObject = {
//     Article:data
//     };
//     Console.log(hbsObject);
//     Res.render("home",{hbsObject});
//     });
//     });

//     app.get("/saved", function(req,res){
//         Article.find({"saved": true}).populate(notes).exec(function(error, articles){
//         var hbsObject ={
//         article: articles
//         };
//         res.render("saved",hbsObject)
//         });
//     });
        

//     app.get("/scrape", function(req,res){
//         axios.get("https//:www.nytimes.com/").then(function(error,response, html){
//         var $ = cheerio.load(response.data);
//         $("article").each(function(i, element){
//             var result = {};
//         Summary = ""
//         if ($(this).find("ul").length){
//             Summary =$(this).find("il").first().text();
//             }
//             else {
//         Summary = $(this).find(p).text();
//         Result.summary = summary;
//         Result.link = "https://www.nytimes.com", +$(this).find("a").attr("href");
        
//         var entry = new Article(result);
//         entry.save(function(err,doc){
//         if (err) {
//         Console.log(err);
//         }
//         else{
//          Console.log(doc);
//         }
//         });
//         };
//         res.send("Scrape Completed");
//         });
//         });
        
//         App.get("/articles", function(req,res){
//         Article.find({}, function(error, doc){
//         if (error){
//         Console.log(error);
//         }
//         else{
//         Res.json(doc);
//         }
//         });
//         });
        
//         App.get("/articles/:id", function(req,res){
//         Article.findOne({"_id": req.parms.id})
//         .populate("note")
//         .exec(function(err, doc){
//         if (err){
//         Console.log(err);
//         }
//         else{
//         Res.json(doc);
//         }
//         });
//         });
       
//         //deleting an article
//         app.post("/articles/delete/:id", function(req,res){
//         Article.findOneandUpdate({"_id": req.parms.id}, {"saved": false, "notes": [] })
//         .exec(function(err, doc){
//         if (err){
//         Console.log(err);
//         }
//         else{
//         Res.json(doc);
//         }
//         });
//         });

//         //new note
//         app.post("/notes/save/:id", function(req,res){
//         var newNote = new Note({
//         Body: req.body.text,
//         Article:req.params.id    });
//         Console.log(req.body)
//         newNote.save(function(error , note) {
        
//             if (error){
//         console.log(error);
//         }
       
//         else {
//         Article.findOneandUpdate({"_id": req.parms.id}, {$push: {"notes": note} })
//         .exec(function(err, doc){
//         if (err){
//         Console.log(err);
//         }
//         else{
//         Res.json(note);
//         }
//         });
//         }
//         });
//         });
        
//         app.delete("/notes/delete/note_id/:article_id", function(req,res){
//         Note.findOneandRemove({"_id": req.parms.note_id}, function(err){
//         if (err){
//         Console.log(err);
//         Res.send(err);
//         }
//         else{
//         res.send("Note Delete");
//         }
//         });
//         });


// // Start the server
// app.listen(PORT, function() {
//   console.log("App running on port " + PORT + "!");
// })
// });
