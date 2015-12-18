/*********************************************************************
 *
 * Licensed Materials - Property of IBM
 * Product ID = 5698-WSH
 *
 * Copyright IBM Corp. 2015. All Rights Reserved.
 *
 ********************************************************************/ 
 
var express = require('express');

var  http = require('http'), path = require('path'), fs = require('fs'), ws = require('iws-light'), Guid = require('guid');

var app = express();

var wsConn;

var wsLibrary = {
		name: 'ts',
		procName: 'tsjs'
};

//var wsUrl = "https://tipadmin:francesco@fbrillante.romelab.it.ibm.com:16311/ibm/TWSWebUI/Simple/index.jsp?tenantId=GD&engineName=nc050122-francesco&engineOwner=tipadmin";

var wsUrl = "https://201ea33e04c44d03879e024625a5cb1e%40bluemix.net:TMx%3DOKk3quu6YIWvJsIEP%3FyVm7ggzC@sidr37wamxo-101.wa.ibmserviceengage.com/ibm/TWSWebUI/Simple/rest?tenantId=BL&engineName=engine&engineOwner=engine";

//all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.multipart());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));
app.use('/js', express.static(path.join(__dirname, '/views/js')));


//development only
if ('development' === app.get('env')) {
	app.use(express.errorHandler());
}

function initWSConnection() {
	if(process.env.VCAP_SERVICES) {
		wsConn = ws.createConnection();
	} else {
		wsConn = ws.createConnection(wsUrl);
	}
//	wsConn.enableLogging(true);
}

initWSConnection();

function getProcessByName(libName, procName, callback) {
	console.log("Loading libraries...");
	wsConn.getProcessLibraries(null, function (err, data) {
	    if (err) {
	    	callback(err);
		} else {
			var library;
			data.forEach(function(lib) {
				if (lib.name == libName) {
					library = lib;
				}
			});
			if (library) {
				console.log("Loading processes...");
				wsConn.getProcesses(library, function (err, data) {
					if (err) {
						callback(err);
					} else {
						var process;
						data.forEach(function(proc) {
							if (proc.name == procName) {
								process = proc;
							}
						});
						if (process) {
							callback(null,process);
						} else {
							callback("process " + procName + " not found (Have you already imported the IWS process on Application Lab?)");
						}
					}
				});
			} else {
				callback(libName + " library not found (Have you already created the IWS process library on Application Lab?)");
			}
		}
	});
}

function runProcessByName(libName, procName, variables, callback) {
	console.log(variables);
	getProcessByName(libName, procName, function (err, process) {
		if (err) {
			callback(err);
		} else {
			wsConn.runProcess({id: process.id, variables: variables}, callback);
		}
	});	
}

app.post('/api/submissions', function(request, response) {
	
	var submission = request.body;
	
	if(!submission){
		response.status(400).send('submission missing').end();
	}
	else{	
		//Init status fields
		if (submission.end) delete submission.end;
		if (submission.jobId) delete submission.jobId;
		
//		var variables = {
//			email: submission.email,
//			hp: submission.hp,
//			birthyear: submission.birthyear
//		};
		
		//Start process on Workload Scheduler
		runProcessByName(wsLibrary.name, wsLibrary.procName,
				/* variables */
				{ "email" : submission.email, "hp" : submission.hp, "birthyear": submission.birthyear }, 
				/* @callback */
				function(err, process){
			if(err){
				console.log(err);
				response.status(500).send(err).end();
			} else{
				console.log("process started");
				response.status(200).end();
			}
		});
	}
});

app.get('/api/submissions', function(request, response) {
	
	getProcessByName(wsLibrary.name. wsLibrary.procName, function(err,data){
		if(err){
			response.status(500).send(err).end();
		} else{
			
		}
	});
});

//first step
app.get('/api/insurance/submit', function(request, response){
	
	var email = request.param('email');
	var hp = request.param('hp');
	var birthyear = request.param('birthyear');
	
	var subject = "Insurance request submitted";
	var body = "The insurance for a "+hp+" hp car and for a person born in "+birthyear+" will be processed. Wait for another email while the insurance cost will be generated.";
	
	sendEmail(email, email, subject, body, function(err, data){
		if(err){
			response.status(500).send(err).end();
		} else{
			response.send("The insurance for a "+hp+" hp car and for a person born in "+birthyear+" will be processed.");
		}
	});
	
//	var insurance = request.body;
//	
//	console.info(insurance);
//	
//	var email = insurance.email;
//	var hp = insurance.hp;
//	var birthyear = insurance.birthyear;
//	
//	response.send("The insurance for a "+hp+" hp car and for a person born in "+birthyear+" will be processed.");																																																																																																																																						
		
});

//second step
app.get('/api/insurance/cost', function(request, response){
	
	var email = request.param('email');
	var hp = request.param('hp');
	var birthyear = request.param('birthyear');
	
	var insuranceCost = (hp*10) + (birthyear-1900);

	var subject = "Insurance cost";
	var body = "The insurance cost for a "+hp+" hp car and for a person born in "+birthyear+" is "+insuranceCost+"$";
	
	sendEmail(email, email, subject, body, function(err, data){
		if(err){
			response.status(500).send(err).end();
		} else{
			response.send("The insurance cost for a "+hp+" hp car and for a person born in "+birthyear+" is "+insuranceCost+"$");
		}
	});
});

function sendEmail(to, from, subject, text, callback){
	
	var credentials;
	
	if (process.env.VCAP_SERVICES) {
	    var env = JSON.parse(process.env.VCAP_SERVICES);
	    credentials = env['sendgrid'][0].credentials;
	} else {
	    credentials = {
	        "hostname": "smtp.sendgrid.net",
	        "username" : "ionEf0272o",
	        "password" : "MPMxvDC720aG4423"
	    };
	}
	
	var sendgrid  = require('sendgrid')(credentials.username, credentials.password);
	sendgrid.send({
		to: to,
		from: from,
		subject: subject,
		text: text
	},
	/* @callback */
	function(err, json) {
		if (err) {
			callback(err);
		} else {
			callback(null, json);
		}
	});
}

http.createServer(app).listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});