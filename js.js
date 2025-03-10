console.clear();
let cmd = '!v', voz = 'Sabina', usarCMD = true, volumen, volumring, isDice = false, isUser = false;
let textoPendiente 		= [];
let mensajes			= [];
const TTS_BASE 			= 'https://api.streamelements.com/kappa/v2/speech';
const RingAlarm 		= new Audio('https://github.com/Xkipper/MaeStream/raw/main/maeSND/msgring.mp3');
const AUDIO_DELAY 		= 2000;
let isPlay				= false;
let isLoad				= false;


const elements = {
	source:		document.querySelector('#source'),
	audio:		document.querySelector('#audio'),
};


elements.audio.addEventListener('ended', end);


window.addEventListener('onWidgetLoad', async function(obj) {
	// TikTok Service Status TEST

	const req = new XMLHttpRequest;
	req.open('GET', 'https://tiktok-tts.weilnet.workers.dev/api/status', false);
	req.headers;
	req.send();
	console.group('TikTok TTS Service Status');
	if (req.status === 200) {
		console.info(`TikTok Service available: ${req.responseText}`);
	}
	else {
		console.error(`TikTok Service not available: ${req.responseText}`);
	}
	console.groupEnd();

	// Load Params
	const fieldData 	= obj.detail.fieldData;
	cmd 				= fieldData['command'];
	voz 				= fieldData['voz'];
	usarCMD 			= fieldData['useCmd'];	
	isUser 				= fieldData['isUser'];
	isDice 				= fieldData['isDice'];
	volumen 			= fieldData['volumen'];
	volumring 			= fieldData['volumring'];


});


window.addEventListener('onEventReceived', async function(obj) {

	if (obj.detail.event || obj.detail.listener) {	

		const listener = obj.detail.listener;
		const data = obj.detail.event.data;

		// Manejo de eventos de Follow
		if (listener === 'follower-latest') {
			
			const followerName = obj.detail.event.name;
			const followMessage = `¡Gracias por seguírme, ${followerName}!`; // Mensaje personalizado			
			
			textoPendiente.push(followMessage);
			
			return;
		}


		if (data.text == undefined || data.text.length < 2) return;

		const textLength = (new TextEncoder).encode(data.text).length;

		if (textLength == 0) return;

		const rawTxt = data.text.toLowerCase();

		if (usarCMD == true && !rawTxt.startsWith(cmd.toLowerCase())) {
			console.log('-- No hay Ciclo --', usarCMD, rawTxt.startsWith(cmd.toLowerCase()), rawTxt, cmd);
			return;
		}

		// IGNORAR ESTOS NICKS
		if (data.displayName === 'BotRixOficial') return;
		if (data.displayName === 'StreamElements') return;
		if (data.displayName === 'own3d') return;
		if (data.displayName === 'nightbot') return;

		limpiarTexto(data.text, data.emotes)
			.then(async (textoLimpio) => {
				if (textoLimpio == null) return;

				console.log('>>', textoLimpio);
				
				let nick = data.nick.replaceAll('_', ' ') + ' ';

				if (isDice) {
					nick += 'dice...';
				}

				let cadena = textoLimpio;

				if (isUser) {
					cadena = nick + textoLimpio;
				}

				const txtLength = (new TextEncoder).encode(cadena).length;
				if (txtLength > 299) cadena = cadena.substring(0, 299);

				textoPendiente.push(cadena);				

			});

	}

});

// Audio Ended Event
function end() {	
	console.log('evento END(cola ,isPlay)', textoPendiente.length, isPlay);
	const txt = textoPendiente.shift();
	setTimeout(() => {
		isLoad = false;
		isPlay = false;
		console.log('evento END_2(cola ,isPlay)', textoPendiente.length, isPlay);
	}, 1500);

}


async function playTTS(text) {
	
	if (!text) text = 'Error. Texto nulo.';
	
	console.log('playTTS()', textoPendiente.length, isPlay);

	if (isPlay == true) return;

	try {
		if (voz.startsWith('es_')) {
		  await TikTokTTS(text);
		} else if (voz.includes('Raul') || voz.includes('Sabina')) {
			textoPendiente.push(text);
			await hablarTexto();
		} else {
		  const params = new URLSearchParams({ voice: voz, text: encodeURIComponent(text) });
		  const speakUrl = `${TTS_BASE}?${params.toString()}`;
		  console.log('Reproduciendo TTS:', speakUrl);
	
		  elements.source.src = speakUrl;
		  elements.audio.load();
		  elements.audio.volume = volumen / 100;
		  isPlay = true;
		  await elements.audio.play();
		}
	} catch (error) {
		console.error('Error al reproducir TTS:', error);
		// Fallback a una voz predeterminada
		voz = 'Sabina';
		isPlay = false;
		//await playTTS(text); // Reintento con la voz de fallback
	} finally {
		// Asegurarse de que la cola avance incluso si hay errores
		//setTimeout(end, AUDIO_DELAY);
	}
	
}


async function TikTokTTS(text) {

	if (isPlay == false) {
		const url = 'https://tiktok-tts.weilnet.workers.dev/api/generation';
		const options = {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{"text":"' + text + '","voice":"' + voz + '"}',
		};
		try {
			const response = await fetch(url, options);
			const data = await response.json();
			if (data === null) {
				console.error(`TikTok TTS Generation failed ("${data.error}")`);
				voz = 'Sabina';
				isPlay = false;
				//playTTS(text);
				return;
			}
			else {
				console.info('TikTok TTS - OK', data);
				elements.source.src = `data:audio/mpeg;base64,${data.data}`;
				const audio = elements.audio;
				audio.load();
				audio.volume = (volumen / 100);
				isPlay = true;
				audio.play();
			}
		}
		catch (e) {
			console.error(e);
			console.log('If the error code is 503, the service is currently unavailable. Please try again later.');
			console.log(`Voice: ${voz}`);
			console.log(`Text: ${text}`);
			voz = 'Sabina';
			isPlay = false;
			//playTTS(text);
			return;
		}

	}
}

async function limpiarTexto(chat, emotes) {

	return new Promise(async (res, rej) => {

		playRing();

		const loweCap = chat.toLowerCase();
		
		if (loweCap.indexOf('http') > -1) return res(null);
		if (loweCap.indexOf('www.') > -1) return res(null);
	
		// Elimina los Emotes
		for (let i = 0; i < emotes.length; i++) {
			// Permite Emojis
			if (emotes[i].name.length <= 2) continue;
			chat = chat.replace(emotes[i].name, '');
			chat = chat.replace('  ', ' ');			
		}
	
		const tmpTxT = chat.split(' ');
		// Borra el comando
		if (tmpTxT[0].startsWith('!')) {
			tmpTxT[0] = tmpTxT[0].replace(tmpTxT[0], '');
		}
	
		chat = tmpTxT.join(' ');
		chat = chat.trim();
	
		console.log('CHAT:', chat, chat.length);
	
		if (chat.length > 0 && (chat != '' || chat != ' ' || chat != '  ')) {
			return res(chat);
		}
	})


}

function playRing() {
	RingAlarm.volume = (volumring / 100);
	RingAlarm.play();
}



let voices 		= [],
	ttsRate		= 1.2,
	ttsPitch	= 1,
	ttsVolumen	= 1;

const synth = window.speechSynthesis;


// Carga y Filtrado del Locutor
function cargarVoces() {

	if (typeof speechSynthesis === "undefined") {
		return;
	}

	voices = speechSynthesis.getVoices();

	console.log("..:: CARGA DE VOCES ::..")
	console.log(voices);
	
	/*
	for (let index = 0; index < voices.length; index++) {
	
		if (voices[index].lang.includes('es-')){			
			document.getElementById("consol").innerHTML += `${voices[index].name} - ${voices[index].name}<br/>`;
		}
	}
	*/
}


// LLenar array voices
cargarVoces();


// Segunda llamada a la carga de Voces (no se cargan a la primera)
if (speechSynthesis.onvoiceschanged !== undefined) {
	speechSynthesis.onvoiceschanged = cargarVoces;
}


function hablarTexto() {
	
	if (synth.speaking) {
		console.error("speechSynthesis.speaking");
		return;
	}

	const vIndex = voices.findIndex(el => el.name.includes(voz));
	console.log("locutor = ", voices[vIndex]);


	if (textoPendiente.length > 0) {

		const utterThis = new SpeechSynthesisUtterance(textoPendiente[0]);

		utterThis.onend = function (event) {			
			console.log("SpeechSynthesisUtterance.onend");
			end();
			return;
			setTimeout(() => {
								isPlay = false;
								if (voices.length == 0) return;							
								hablarTexto();
			}, AUDIO_DELAY);
		
		};

		utterThis.onerror = function (event) {

			console.error("SpeechSynthesisUtterance.onerror");
			end();
			return;
			isPlay = false;
			textoPendiente.shift();
			playTTS(text);
			
		};

		utterThis.voice 	= voices[vIndex];
		utterThis.volume 	= (volumen / 100); 		// From 0 to 1
		utterThis.rate 		= ttsRate;   			// From 0.1 to 10
		utterThis.pitch 	= ttsPitch;  			// From 0 to 2    

		isPlay = true;
		synth.speak(utterThis);

	}

}


// Cada 1s revisa los mensajes en Cola
setInterval(() => {
	if (isPlay == true)	return;
	if (isLoad == true) return;

	if (textoPendiente.length > 0) {
		isLoad = true;
		playTTS(textoPendiente[0]);
	}

}, 500);

