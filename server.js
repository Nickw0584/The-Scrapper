var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");



//requiring note models
var Note = require(".models/Note.js");
var Article = require("./models/Article.js")
// Scraping tools

var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

// Initialize Express
var app = express();

var PORT =process.env.PORT || 3000;

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
app.engine("handlebars", exphbs({ defaultLayout: "main",
partialsDir:path.join(_dirname, "views/layouts/partials")
}));
app.set("view engine", "handlebars");
app.set("index", __dirname + "/views")

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
    mongoose.connect(MONGODB_URI, {useNewUrlParser: true});

var db = mongoose.connection;

//show any connection errors
db.on("error,", function(error){
    console.log("Mongoose COnnection Error:", error);
});

// after login oked show ok message
db.once("ready", function(){
    console.log("Connection Success");
})

// // Routes

app.get("/", function(req,res){
    Article.find({saved: false}, function(error, ){
    var hbsObject = {
    Article:data
    };
    Console.log(hbsObject);
    Res.render("home",{hbsObject});
    });
    });

    app.get("/saved", function(req,res){
        Article.find({"saved": true}).populate(notes).exec(function(error, articles){
        var hbsObject ={
        article: articles
        };
        res.render("saved",hbsObject)
        });
    });
        

    app.get("/scrape", function(req,res){
        axios.get("https//:www.nytimes.com/").then(function(error,response, html){
        var $ = cheerio.load(response.data);
        $("article").each(function(i, element){
            var result = {};
        Summary = ""
        if ($(this).find("ul").length){
            Summary =$(this).find("il").first().text();
            }
            else {
        Summary = $(this).find(p).text();
        Result.summary = summary;
        Result.link = "https://www.nytimes.com", +$(this).find("a").attr("href");
        
        var entry = new Article(result);
        entry.save(function(err,doc){
        if (err) {
        Console.log(err);
        }
        else{
         Console.log(doc);
        }
        });
        };
        res.send("Scrape Completed");
        });
        });
        
        App.get("/articles", function(req,res){
        Article.find({}, function(error, doc){
        if (error){
        Console.log(error);
        }
        else{
        Res.json(doc);
        }
        });
        });
        
        App.get("/articles/:id", function(req,res){
        Article.findOne({"_id": req.parms.id})
        .populate("note")
        .exec(function(err, doc){
        if (err){
        Console.log(err);
        }
        else{
        Res.json(doc);
        }
        });
        });
       
        //deleting an article
        app.post("/articles/delete/:id", function(req,res){
        Article.findOneandUpdate({"_id": req.parms.id}, {"saved": false, "notes": [] })
        .exec(function(err, doc){
        if (err){
        Console.log(err);
        }
        else{
        Res.json(doc);
        }
        });
        });

        //new note
        app.post("/notes/save/:id", function(req,res){
        var newNote = new Note({
        Body: req.body.text,
        Article:req.params.id    });
        Console.log(req.body)
        newNote.save(function(error , note) {
        
            if (error){
        console.log(error);
        }
       
        else {
        Article.findOneandUpdate({"_id": req.parms.id}, {$push: {"notes": note} })
        .exec(function(err, doc){
        if (err){
        Console.log(err);
        }
        else{
        Res.json(note);
        }
        });
        }
        });
        });
        
        app.delete("/notes/delete/note_id/:article_id", function(req,res){
        Note.findOneandRemove({"_id": req.parms.note_id}, function(err){
        if (err){
        Console.log(err);
        Res.send(err);
        }
        else{
        res.send("Note Delete");
        }
        });
        });


// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
})
});
