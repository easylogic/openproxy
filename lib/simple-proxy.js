var OpenProxy = require('./proxy');


var ProxyServer = new OpenProxy();

ProxyServer.addPlugin({
    beforeRequest : function (session) {
        console.log('before request', session.parse.href);

        //console.log(session.proxy);
    },
    afterResponse : function (session) {
        console.log('after response', session.parse.href);
    }
})

// start
ProxyServer.init();
