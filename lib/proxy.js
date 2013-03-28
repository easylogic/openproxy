var http = require('http'),
    static = require('node-static'),
	util = require('util'),
	fs = require('fs'),
	Session = require('./session'),
	Config  = require('./config');
	
	


function Proxy (opt) {
	
	var def = {
		port : 8888
	};
	
	opt = opt || {};
	
	for(var k in opt) {
		def[k] = opt[k];
	}
	
	this.opt = def;
	
	this.plugin = [];
}

/**
 * load plugin :   current path + /plugin/....
 * 
 */
Proxy.prototype.loadPlugin = function() {
	var path = __dirname + "/plugin";
	var arr = fs.readdirSync(path);
		
	for (var i in arr) {
		if (arr[i].indexOf(".js")  == -1) continue; 

		var PluginObject = require(path + "/" + arr[i]);
		var obj = new PluginObject(); 
		
		this.plugin.push(obj);
	} 

}

/**
 * trigger event to plugin list
 * 
 */
Proxy.prototype.trigger = function(event, session) {
	session = session || {};
	
	for(var i in this.plugin) {
		var func = this.plugin[i][event];
		
		if (func && typeof func == 'function') {
			this.plugin[i][event](session)
		}
	}
}

Proxy.prototype.init = function() {
	this.config = new Config(this.opt);
	
	this.fileService = new(static.Server)(__dirname + '/../public', { 
		headers {
			"X-SERVER-INFO" : "OpenProxy"
		}
	});
	
	this.createServer();
	
	this.loadPlugin();
	
	this.trigger('load');	
}

Proxy.prototype.createServer = function() {
	var self = this;
	
	// create proxy server  
	this.proxy = http.createServer(function(req, res) {
		var session = new Session(self, req, res);
		session.trigger('data');
	})
	

	// https 연결하기 전에 Connect 이벤트 발생 	
	this.proxy.on('connect', function(req, socket, head){
	
	  var session = new Session(self, req, socket, head);
	  session.trigger('connect');  
	})	
	
	// websocket 일 때는 upgrade 이벤트 처리 
	this.proxy.on('upgrade', function(req, socket, head) {
	
	  var session = new Session(self, req, socket, head);
	  session.trigger('upgrade');  	
	
	})	
	
	// listen to 8888
	this.proxy.listen(this.config.opt.port);
}

module.exports = Proxy;