var http = require('http'),
	url = require('url'),
	fs = require('fs'),
	mime = require('mime');

function Router () {
	this.plugin = [];
	
	this.loadPattern();
}

Router.prototype.loadPattern = function() {
	var path = __dirname + "/router";
	var arr = fs.readdirSync(path);
		
	for (var i in arr) {
		if (arr[i].indexOf(".js")  == -1) continue; 

		var PluginObject = require(path + "/" + arr[i]);
		var obj = new PluginObject(); 
		
		this.plugin.push(obj);
	} 
}

Router.prototype.convert = function(target) {
	var variable = this.proxy.config.variable;
	
	for(var k in variable) {
		target = target.replace("{" + k + "}", variable[k])
	}
}

Router.prototype.run = function(session, obj) {
	if (this.plugin[obj.type]) {
		
		var variable = session.proxy.config.variable;
		var target = obj.target; 
		for(var k in variable) {
			target = target.replace("{" + k + "}", variable[k])
		}
		
		obj.target = target;
		
		this.plugin[obj.type].exec(session, obj);
	}
		
}

///////////////////////////////////
//
// Session Event 
//
///////////////////////////////////

Router.prototype.load = function() {
	
}

Router.prototype.unload = function() {
	
}

/**
 * called before request 
 *  
 * @param {Object} session
 */
Router.prototype.beforeRequest = function(session) {
	// search matched hostname 
	var obj = session.proxy.config.hostnameIs(session.$('hostname'));

	if (!obj) return;

	this.run(session, obj);
}

Router.prototype.afterRequest = function(session) {
	
}

Router.prototype.beforeResponse = function(session) {
	
}

Router.prototype.afterResponse = function(session) {
	
}

Router.prototype.error = function(session) {
	// reference error object from session.error 
}

/**
 * called CONNECT method 
 *  
 * @param {Object} session
 */
Router.prototype.connect = function(session) {
	// search matched hostname 
	var obj = session.proxy.config.hostnameIs(session.$('hostname'));

	if (!obj) return;
	
	var host = obj.target.split("/")[0];
	session.$('hostname', host); 
}

module.exports = Router;