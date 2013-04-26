var http = require('http'),
	util = require('util'),
	fs = require('fs'),
	Session = require('./session'),
	Config  = require('./config');
	
var plugin = [];	
	
function Proxy (opt) {
	
	var def = {
		port : 8888
	};
	
	opt = opt || {};
	
	for(var k in opt) {
		def[k] = opt[k];
	}
	
	this.opt = def;
	
	this.initTable();
}

Proxy.prototype.initTable = function() {
	this.domains = null;
	this.patterns = null;
}

Proxy.prototype.setTable = function(table) {
	if (table.length) {
		for(var i = 0, len = table.length; i++) {
			var obj = table[i];
			
			if (obj.type == 'domain') {
				this.domains[obj.source] = obj;
			} else if (obj.type == 'pattern') {
				this.patterns.push(obj);
			}
		}
		
		// sort pattern 
		this.patterns.sort(function(a, b){
			return a < b;
		})
	}
}

/**
 * add plugin object
 *  
 */
Proxy.prototype.addPlugin = function(obj) {
	plugin.push(obj);
}

/**
 * trigger event to plugin list
 * 
 */
Proxy.prototype.trigger = function(event, session) {
	session = session || {};
	
	for(var i in plugin) {
		
		if (plugin[i].id == event) {
			plugin[i].receive(session);	
			return ;
		} else {
			var func = plugin[i][event];
		
			if (func && typeof func == 'function') {
				plugin[i][event](session)
			}
		}
	}
}

Proxy.prototype.init = function() {
	
	this.createServer();
	
	this.trigger('load');	
}

Proxy.prototype.createServer = function() {
	var self = this;
	
	// create proxy server  
	this.proxy = http.createServer(function(req, res) {
		
		var domain = require('domain').create();		
		
		domain.on('error', function(err){
			console.log(err.stack)
		})
		
		domain.add(req);
		domain.add(res);
		
		domain.run(function(){
			var session = new Session(self, req, res);
			session.trigger('data');			
		})
	})
	
	this.proxy.setMaxListeners(0);

	// https 연결하기 전에 Connect 이벤트 발생 	
	this.proxy.on('connect', function(req, socket, head){
		
		var domain = require('domain').create();		
		
		domain.on('error', function(err){
			console.log(err.stack)
		})
		
		domain.add(req);
		domain.add(socket);
		domain.add(head);
		
		domain.run(function(){
		  var session = new Session(self, req, socket, head);
		  session.trigger('connect');  			
		})
	})	
	
	// websocket 일 때는 upgrade 이벤트 처리 
	this.proxy.on('upgrade', function(req, socket, head) {
	  var session = new Session(self, req, socket, head);
	  session.trigger('upgrade');  	
	
	})	
	
	// listen to 8888
	this.proxy.listen(this.opt.port);
}

module.exports = Proxy;
