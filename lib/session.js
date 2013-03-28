var url = require('url'),
	net = require('net'),
	http = require('http');

function Session (proxy, req, res, head) {
	
	this.proxy = proxy;  
	this.req = req;
	this.res = res;
	this.head = head;
	this.respData = null;
	
	this.init();	
	
}

Session.prototype.exec_data = function() {
	var self = this; 
	this.proxy.trigger('beforeRequest', this);

	if (this.hasResponse) return false;
	
	// get changed url data   
	var opt = this.opt();
	
	// create new http connection 
	var proxyReq = http.request(opt, function(response){
			
			if (self.hasResponse) return ;
						
			self.proxy.trigger('beforeResponse', self);
		
			if (self.hasResponse) return ;		
		
			self.res.writeHead(response.statusCode, response.headers);		  
			
			response.pipe(self.res);		
			self.res.pipe(response);
			
			self.proxy.trigger('afterResponse', self);
	})
	  
	proxyReq.on('error', function(e){
		self.error = e; 
		self.proxy.trigger('error', self)
	})
	  
	proxyReq.on('data', function(data) { 
		console.log('proxy request data', data);
	})
	  
	this.req.pipe(proxyReq);
	
	this.proxy.trigger('afterRequest', this);	
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

Session.prototype.$req = function(k) { 
		return this.req[k];
}
	
Session.prototype.$res = function(k) { 
		return this.res[k];
}
	
Session.prototype.init = function() { 
	
	if (this.$req('method') == 'CONNECT') { 
		this.parse = url.parse("https://" + this.$req('url'));
	} else { 
		this.parse = url.parse(this.$req('url'));
	}
	
}
	
Session.prototype.response = function(data) {
		this.respData = data;

		if (this.respData.status == 200) {
			var headers =  {
				'Content-Length' : this.respData.data.length, 
				'Content-Type' : this.respData.contentType ,
				'Cache-Control' : 'no-cache,must-revalidate'
			}
	
			this.res.writeHead(this.respData.status, headers);			
		} else {
			this.res.writeHead(this.respData.status);
		}	

		this.res.write(this.respData.data);
		this.res.end();
		
		this.hasResponse = true; 
}

Session.prototype.opt = function() { 
		var headers = this.$req('headers');
		  
		headers['connection'] = headers['proxy-connection'];
		  
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
