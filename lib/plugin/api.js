function Api () {
	
}

/**
 * called before request 
 *  
 * @param {Object} session
 */
Api.prototype.beforeRequest = function(session) {
	// search matched hostname 
	if (!session.hostnameIs('openproxy')) return;

	this.parse(session);
}

Api.prototype.parse = function(session) {

	var pathname = session.$('pathname');
	
	if (pathname == '/data') { 
		session.res.writeHead(200, { 'Content-Type' : 'application/json;charset=utf-8' });
		session.res.end(session.proxy.config.data);
	} else if (pathname == '/save') { 
		var temp = [];
		session.req.on('data', function(chunk) {
			temp.push(chunk);
		});
		
		session.req.on('end', function(){
			var obj = JSON.parse(temp.join());
			//session.res.writeHead(200, { 'Content-Type' : 'application/json;charset=utf-8' });
			//session.res.end(this.router.save(obj));	
		});
	} else { 
		session.req.on('end', function(){
			session.proxy.fileService.serve(session.req, session.res);
		})
  	}
}

module.exports = Api