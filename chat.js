var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');


app.use(express.static('public'));

//Nos conectamos a la base de datos

//  ----------------PARA LOCAL-----------------
	/*mongoose.connect('mongodb://localhost:27017/chat',function(err){
		if (!err) {
			console.log('Se ha conectado a la base de datos del chat chat');
		}else{
			console.log(err);
		}

	}); ----------------PARA LOCAL----------------- */

//  ----------------PARA MLAB----------------- //
	mongoose.connect('mongodb://admin:biurrunolcoz@ds115131.mlab.com:15131/chat_dsm_db',function(err){
		if (!err) {
			console.log('Se ha conectado a la base de datos mLab');
		}else{
			console.log(err);
		}

	}); /*----------------PARA LOCAL----------------- */

	//Definimos el Schema

	var Schema = mongoose.Schema;
	var ObjectId = Schema.ObjectId;
	var Mensaje = new Schema({
		_id: Number,
		usuario: Object,
		texto: String,
		fecha: Date
	});
	var Mensaje = mongoose.model('Mensajes', Mensaje);

	// Almacenamos los nombres de los usuarios, las imagenes, los mensajes, quien los envia y la hora

	var userImgs = {};

	var writeUsers= [];
	var nombreUsers= [];

	/*function fecha()
	{
		var date = new Date()
		var day = date.getDate();
		var monthIndex = date.getMonth();
		var year = date.getFullYear();
		return day + '/' + (monthIndex+1) + '/' + year;
	}*/

	io.sockets.on('connection', function (socket) 
	{

	//console.log("estos son los mensajes que almacena : "+ mensajes);

	//Cuando se nos conecta un nuevo usuario, le mandamos la lista de usuarios
	socket.on('start', function()
	{
		//console.log("estos son los usuarios guardados : "+ usernames);
		socket.emit('checkusers',nombreUsers);
	});
		
	// Cuando el cliente escribe algo
	socket.on('sendchat', function (mensaje) 
	{
		//guardamos el mensaje, quien lo ha escrito y la hora
		/*mensajes.push(mensaje);
		emisorMensajes.push(socket.username);
		horaMensajes.push(fecha());*/
		Mensaje.count({}, function( err, count){
			var nuevoMensaje = new Mensaje({
				_id: count+1,
				usuario: {
					nombre: socket.username,
					img: "default.jpg"
				},
				texto: mensaje,
				fecha: (new Date())
			});

			nuevoMensaje.save(function(err){
				if (!err) {
					console.log("Mensaje añadido en BD")
				} else {
					console.log(err);
				}
			// Se lo mandamos de vuelta a él y al resto de sockets mediante 
			// la funcion local updatechat
				io.sockets.emit('updatechat', socket.username, mensaje, new Date(),userImgs);
			})
		});
	});

	// Cuando se nos conecta un nuevo usuario
	socket.on('adduser', function(username)
	{
		// Le asignamos al socket el nombre de usuario
		socket.username = username;


		//Almacenamos nombre y creamos un estado para este usuario nuevo
		writeUsers.push(false);
		nombreUsers.push(username);

		// Imagen por defecto
		userImgs[username] = "default.jpg";
		// Informamos al usuario de su conexion
		socket.emit('serverinfo', 'Te has conectado', true);

		// Mandamos los mensajes anteriores, mejor enviarlo solo cunado el usuario pulse el boton de mensajes anteriores
		//ahora lo mandamos en la funcion "obtenerMensajesAnteriores"
      	//socket.emit('updateMessages',mensajes,emisorMensajes,horaMensajes,userImgs);

		if(username!=undefined && username !=null)
		{
			// Avisamos a todos los demás de que hay un nuevo usuario
			//creamos una nueva para generar una ventana emergente 
			socket.broadcast.emit('serverinfo',username + ' se ha conectado',false);
			// Mandamos la nueva lista de usuarios
			//io.sockets.emit('updateusers', usernames, userImgs);
			io.sockets.emit('updateusers', nombreUsers, userImgs,writeUsers);	
		}
	});

	//Cuando el usuario pulse en el boton mensajes anteriores cargamos 10 mensajes mas
	socket.on('obtenerMensajesAnteriores', function(offset)
	{

		var mensajes= [];
		var emisorMensajes = [];
		var horaMensajes = [];

		Mensaje.count({}, function( err, count){
			if (!err) {
				//console.log("count: " + count);
				//console.log("offset: " + offset)
				var GreaterThan; //GreaterThan
				if ((count - offset)<10) {
					GreaterThan = 0;
				} else{
					GreaterThan = (count - offset) - 10;
				}
				
				Mensaje.find({_id: {$gt: GreaterThan, $lte: (count - offset)}}, function(err2, docs)
				{
					//console.log("Length: " + docs.length);
					if (!err2) {
						for (var i = 0 ; i < docs.length; i++) {
							//console.log("Texto: " + docs[i].texto + "\n Usuario:" + docs[i].usuario.nombre + "\n Fecha: " + docs[i].fecha)
							mensajes.push(docs[i].texto);
							emisorMensajes.push(docs[i].usuario.nombre);
							horaMensajes.push(docs[i].fecha);
						};

						socket.emit('oldMessages',mensajes.reverse(),emisorMensajes.reverse(),horaMensajes.reverse(),userImgs,GreaterThan);
					} else {
						console.log(err2);
					}
				});
			} else{
				console.log(err)
			}
			
		});

		/*Mensaje.find({}, function(err, docs) {
			for (var i = docs.length -1; i<0 ; i--) {
				mensajes.push(docs[i].texto);
				emisorMensajes.push(docs[i].usuario.nombre);
				horaMensajes.push(docs[i].fecha);
			};
			console.log(docs.length);*/
		
			//genero los 3 nuevos arrays
			/*var mensajesAnteriores=extraerMensajes(offset,mensajes);
			var emisorMensajesAnteriores=extraerMensajes(offset,emisorMensajes);
			var horaMensajesAnteriores=extraerMensajes(offset,horaMensajes);*/


			// Mandamos los mensajes anteriores 
	      	//socket.emit('updateMessages',mensajesAnteriores,emisorMensajesAnteriores,horaMensajesAnteriores,userImgs);
	      	

      	//})
	});

	//cojo los array antiguos y genero unos nuevos mas pequeños cogiendo la ultima parte, es decir,
	//lo ultimos 10 o 20....
	function extraerMensajes(offset,arrayAntiguo)
	{
		// Numero total de mensajes
		var antiguo=arrayAntiguo.length;

		//el array a enviar
		var mensajesAnteriores= [];
		//var mensajesAnterioresGirado;

		//definimos la ventana
		var ventana;
		//la suma enlaza la posicion del array antiguo con la posicion del nuevo array
		var suma;

		var diferencia=antiguo-offset;

		//esto es para generar una ventana deslizante
		if(diferencia>=10)
		{
			ventana=10;
			suma=diferencia-10;
		} else if((diferencia>=0)&&(diferencia<10))
		{
			ventana=diferencia;
			suma=0;
		} else if(diferencia<0)
		{
			ventana=0;
			suma=0;
		}


		//generamos el nuevo array
		for(var i=0;i<ventana;i++)
		{
			mensajesAnteriores[i]=arrayAntiguo[i+suma];
		}
		// Le damos la vuelta al array para que el cliente muestre los mensajes en orden
      	return  mensajesAnteriores.reverse();

	}

	// Cuando alguien se desconecta
	socket.on('disconnect', function()
	{
		
		var usuarioOut=socket.username;

      	var posicion = nombreUsers.indexOf(socket.username);
      	//console.log(posicion);
      	nombreUsers.splice(posicion,1);
      	writeUsers.splice(posicion,1);

      	io.sockets.emit('updateusers', nombreUsers, userImgs,writeUsers);
      	socket.broadcast.emit('serverinfo', usuarioOut + ' se ha desconectado',false);
	});


	//vamos a crear un nuevo array boolean para guardar estados, si esta escribiendo --> true, sino a false.
	//el estado nos dira si hay k poner "esta escribiendo o no" cuando pulse o levante una tecla
	//haciendo una busqueda del nombre localizaremos el estado de dicho usuario y lo modificaremos
	socket.on('UserWritting', function(username)
	{

		var posicion = nombreUsers.indexOf(username);

      	writeUsers[posicion]=true;  

      	// Mandamos la nueva lista de usuarios con los estados de escritura
      	io.sockets.emit('updateusers', nombreUsers, userImgs,writeUsers);
	});

	//para cuando termine de escribir
	socket.on('UserNotWritting', function(username)
	{
		
		var posicion = nombreUsers.indexOf(username);

      	writeUsers[posicion]=false;   
      	// Mandamos la nueva lista de usuarios con los estados de escritura
      	io.sockets.emit('updateusers', nombreUsers, userImgs,writeUsers);
	});
});

/*-------------------------------------
            INICIO DEL SERVER
  Ponemos a funcionar el servidor en
  el puerto configurado o en el 8080
--------------------------------------*/

var port = process.env.PORT || 8080;
server.listen(port);
