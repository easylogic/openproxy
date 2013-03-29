var url = require('url'),
	net = require('net'),
	http = require('http'),
	fs = require('fs'),
	mime = require('mime'),
	util = require('util'),
	path = require('path');

function Session (proxy, req, res, head) {
	
	this.proxy = proxy;  
	this.req = req;
	this.res = res;
	this.head = head;
	
	this.init();	
	
}

Session.prototype.setProxyResponse = function(response) {
	this.proxyRes = response;
}

Session.prototype.getProxyResponse = function() {
	return this.proxyRes;
}

Session.prototype.changeHost = function(obj) {
	var change = url.parse(this.$('protocol') + "//" + obj.target);
	
	if (change.hostname) 	this.$('hostname', change.hostname);
	if (change.port) 		this.$('port', change.port);	
}

/**
 * obj {
 * 	  source,
 *    target,
 *    isDir
 *    isFile,
 *    isStatus
 * }
 *  
 * @param {Object} obj
 */
Session.prototype.changeUrl = function(obj) {
	var target = obj.target;
	if (obj.isDir) {
		target += "/" + session.$("path");
	}

	// if target is file 
	if (obj.isFile && obj.isDir) {			 
		this.file(target);
	} else if (obj.isStatus) {
		this.response(obj)
	}
	// if target is string about http 
	else {
		var path = this.$('protocol') + "//" + this.$('hostname').replace(obj.source, target) + this.$('path');
		var change = url.parse(path);
		
		if (change.hostname) 	this.$('hostname', change.hostname);
		if (change.port) 		this.$('port', change.port);
		
		this.$('path', change.path);			
	}
}

Session.prototype.exec_data = function() {
	var self = this; 
	this.proxy.trigger('beforeRequest', this);

	if (this.hasResponse) return false;
	
	// get changed url data   
	var opt = this.opt();
	
	// create new http connection 
	var proxyReq = http.request(opt, function(response){
			var _res = self.res; 
			_res.statusCode = response.statusCode;
			_res.headers = response.headers;
			
			if (self.hasResponse) return ;
						
			self.proxy.trigger('beforeResponse', self);
		
			if (self.hasResponse) return ;		
		
			_res.writeHead(_res.statusCode, _res.headers);		  
			
			response.pipe(_res);		
			_res.pipe(response);
	})
	
	proxyReq.on('error', function(e){
		self.error = e; 
		self.proxy.trigger('error', self)
	})
	  
	proxyReq.on('data', function(data) { 
		console.log('proxy request data', data);
	})
	  
	this.req.pipe(proxyReq);

}

Session.prototype.exec_connect = function() {
	  var self = this; 
	  this.proxy.trigger('connect', this);
	  
	  var opt = this.opt();
	  
	  var serverSocket = net.connect(opt.port, opt.host, function(){
	    self.res.write(
	    		"HTTP/1.1 200 Connection Established\r\n" + 
	    		"Proxy-agent:RProxy\r\n" + 
	    		"\r\n"
	    );
	
	    serverSocket.write(self.head);
	    serverSocket.pipe(self.res);
	    self.res.pipe(serverSocket);
	    
	  })	
}

Session.prototype.exec_upgrade = function() {
	this.res.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' + 
				 'Upgrade: WebSocket\r\n' +
				 'Connection: Upgrade\r\n' + 
				 '\r\n'
	);  
				 
	this.res.pipe(this.res);	
}

Session.prototype.trigger = function(event) {
	
	this.proxy.trigger('log', this.url());
	
	switch(event){
	case 'data': this.exec_data(); break;
	case 'connect' : this.exec_connect(); break;
	case 'upgrade' : this.exec_upgrade(); break;
	}
}

Session.prototype.url = function() { 
		return url.format(this.parse);
}
	
Session.prototype.$ = function(key, value) { 
	
		if (arguments.length == 0)  {
			return this.parse;
		} else if (arguments.length == 1) { 
			if (key == 'port') {
				return parseInt(this.parse[key] || 80);
			} else if (key == 'protocol') {
				return this.parse[key] || "http:";			
			} else { 
				return this.parse[key];
			}
		} else if (arguments.length == 2) { 
			this.parse[key] = value;
		}
}

	
Session.prototype.hostnameIs = function(hostname) { 
	return (this.$('hostname') == hostname);
}

Session.prototype.hostnameContains = function(hostname) {
	return (this.$('hostname').indexOf(hostname) > -1);
}

Session.prototype.$req = function(k, v) {
	
	if (arguments.length == 1) {
		return this.req[k];		
	} else if (arguments.length == 2){
		return this.req[k] = v;
	}
}
	
Session.prototype.$res = function(k,v) {
	
	if (arguments.length == 1) {
		return this.res[k];		
	} else if (arguments.length == 2){
		return this.res[k] = v;
	}	 
}

Session.prototype.init = function() { 
	var self = this; 
	if (this.$req('method') == 'CONNECT') { 
		this.parse = url.parse("https://" + this.$req('url'));
	} else { 
		this.parse = url.parse(this.$req('url'));
	}
	
	this.res.on('finish', function() {
		self.proxy.trigger('afterResponse', self);
	})
	
	//console.log(this.url());
	
}

Session.prototype.file = function(target) {
	if (!target) {
		target = path.join(this.proxy.file, this.$('path'));
	}
	
	if (fs.existsSync(target)) {
		var stat = fs.statSync(target);
		
		var headers =  {
			'Content-Length' : stat.size, 
			'Content-Type' : mime.lookup(target) ,
			'Cache-Control' : 'no-cache,must-revalidate',
			'X-Proxy-Info' : 'OpenProxy'
		}

		this.res.writeHead(200, headers);	
		
		fs.createReadStream(target).pipe(this.res);
		
		this.hasResponse = true; 
	} else {
		this.response({
			status : 400,
			data : "File not exists : " + target
		})
	}	
}

/**
 * data {
 *    status
 *    contentType
 *    data	
 * }
 *  
 * @param {Object} data
 */	
Session.prototype.response = function(data) {
		if (data.status == 200) {
			var headers =  {
				'Content-Length' : data.data.length, 
				'Content-Type' : data.contentType ,
				'Cache-Control' : 'no-cache,must-revalidate',
				'X-Proxy-Info' : 'OpenProxy'
			}
	
			this.res.writeHead(data.status, headers);			
		} else {
			this.res.writeHead(data.status);
		}
		
		this.res.write(data.data);
		this.res.end();
		
		this.hasResponse = true; 
}

Session.prototype.opt = function() { 
		var headers = this.$req('headers');
		  
		headers['connection'] = headers['proxy-connection'];
		
		delete headers['proxy-connection'];
		  
		var opt = {
			host: this.$('hostname'),
			port: this.$('port'),
			path: this.$('path'),
			method: this.$req('method'),
			headers: headers
		};		
		
		return opt;
}

module.exports = Session;
