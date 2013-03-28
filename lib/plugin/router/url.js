var url = require('url');

function Url () {
	
}

Url.prototype.exec = function(session, obj) {
	var target = obj.target;
	if (obj.isDir) {
		target += "/" + session.$("path");
	}

	// if target is file 
	if (obj.isFile && obj.isDir) {			 
		// 파일일 때는 특정 파일의 데이타를 넘겨준다. 
		if (fs.existsSync(target)) {
			session.response({
				status : 200,
				data : fs.readFileSync(target),
				contentType : mime.lookup(target)
			})	
		} else {
			session.response({
				status : 400,
				data : "File not exists : " + target + " from " + obj.source
			})
		}
		
	} 
	
	// if target is string about http 
	else {
		var path = session.$('protocol') + "//" + session.$('hostname').replace(obj.source, target) + session.$('path');
		var change = url.parse(path);
		
		if (change.hostname) 	session.$('hostname', change.hostname);
		if (change.port) 		session.$('port', change.port);
		
		session.$('path', change.path);			
	}
}

module.exports = Url;