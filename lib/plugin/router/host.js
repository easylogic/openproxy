function Host () {
	
}

Host.prototype.exec = function(session, obj) {
	var change = url.parse(session.$('protocol') + "//" + obj.target);
	
	if (change.hostname) 	session.$('hostname', change.hostname);
	if (change.port) 		session.$('port', change.port);
}

module.exports = Host;