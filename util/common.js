const logging = require('..//util//logging');

var debugTimers = {};

exports.bilgewaterIconUrl = 'https://i.imgur.com/zjBxppj.png';

exports.capitalizeFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

exports.capitalizeAllFirstLetters = function(string) {
    var words = string.split(' ');
    for (var i = 0; i < words.length; i++) {
      words[i] = exports.capitalizeFirstLetter(words[i]);
    }

    return words.join(' ');
};

exports.formatNumberLength = function(number, length) {
    var numberString = "" + number;
    while (numberString.length < length) {
        numberString = "0" + numberString;
    }
    return numberString;
};

exports.msToTime = function(duration) {
  var seconds = parseInt((duration/1000)%60);
  var minutes = parseInt((duration/(1000*60))%60);

  seconds = (seconds < 10) ? '0' + seconds : seconds;

  return minutes + 'm ' + seconds + 's';
};

exports.msToDate = function(timestamp) {
  var date = new Date(timestamp);
  return date.customFormat('#MM#/#DD#/#YYYY#')
};

exports.getRandomIntInclusive = function(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
};

exports.buildEmbed = function(embedColor, embedTitle, embedUrl, embedAuthor, embedThumbnail, embedFields, embedFooter) {
  var embed = {};

  if (embedColor)
    embed.color = embedColor;
  if(embedTitle)
    embed.title = embedTitle;
  if(embedUrl)
    embed.url = embedUrl;
  if(embedAuthor)
    embed.author = embedAuthor;
  if(embedThumbnail)
    embed.thumbnail = embedThumbnail;
  if(embedFields)
    embed.fields = embedFields;
  if(embedFooter)
    embed.footer = embedFooter;

  return embed;
}

exports.startDebugTimer = function(processName) {
  if(debugTimers[processName] === undefined)
    debugTimers[processName] = [];
  debugTimers[processName].push(new Date().getTime());
}

exports.stopDebugTimer = function(processName) {
  var startTime = debugTimers[processName].shift();
  var elapsedTime = new Date().getTime() - startTime;

  logging.botLogger.log({
    level: 'Info',
    message: `(ready.js:client) Process ${processName} completed in ${elapsedTime}ms`
  });
}

//*** This code is copyright 2002-2016 by Gavin Kistner, !@phrogz.net
//*** It is covered under the license viewable at http://phrogz.net/JS/_ReuseLicense.txt
//*** Reuse or modification is free provided you abide by the terms of that license.
//*** (Including the first two lines above in your source code satisfies the conditions.)

// Include this code (with notice above ;) in your library; read below for how to use it.

Date.prototype.customFormat = function(formatString){
	var YYYY,YY,MMMM,MMM,MM,M,DDDD,DDD,DD,D,hhhh,hhh,hh,h,mm,m,ss,s,ampm,AMPM,dMod,th;
	var dateObject = this;
	YY = ((YYYY=dateObject.getFullYear())+"").slice(-2);
	MM = (M=dateObject.getMonth()+1)<10?('0'+M):M;
	MMM = (MMMM=["January","February","March","April","May","June","July","August","September","October","November","December"][M-1]).substring(0,3);
	DD = (D=dateObject.getDate())<10?('0'+D):D;
	DDD = (DDDD=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dateObject.getDay()]).substring(0,3);
	th=(D>=10&&D<=20)?'th':((dMod=D%10)==1)?'st':(dMod==2)?'nd':(dMod==3)?'rd':'th';
	formatString = formatString.replace("#YYYY#",YYYY).replace("#YY#",YY).replace("#MMMM#",MMMM).replace("#MMM#",MMM).replace("#MM#",MM).replace("#M#",M).replace("#DDDD#",DDDD).replace("#DDD#",DDD).replace("#DD#",DD).replace("#D#",D).replace("#th#",th);

	h=(hhh=dateObject.getHours());
	if (h==0) h=24;
	if (h>12) h-=12;
	hh = h<10?('0'+h):h;
  hhhh = hhh<10?('0'+hhh):hhh;
	AMPM=(ampm=hhh<12?'am':'pm').toUpperCase();
	mm=(m=dateObject.getMinutes())<10?('0'+m):m;
	ss=(s=dateObject.getSeconds())<10?('0'+s):s;
	return formatString.replace("#hhhh#",hhhh).replace("#hhh#",hhh).replace("#hh#",hh).replace("#h#",h).replace("#mm#",mm).replace("#m#",m).replace("#ss#",ss).replace("#s#",s).replace("#ampm#",ampm).replace("#AMPM#",AMPM);
}

/****************************************************************************

myDateObject.customFormat(formatString)
-------------------------------------------------
arguments:
	myDateObject - a JavaScript Date object
	formatString - a string containing one or more tokens to be replaced


returns:
	a new string based on formatString, with all valid tokens replaced with
	values from dateObject


description:
	Use customFormat(...) to format a Date object in anyway you like.
	Any token (from the list below) gets replaced with the corresponding value.


	token:     description:             example:
	#YYYY#     4-digit year             1999
	#YY#       2-digit year             99
	#MMMM#     full month name          February
	#MMM#      3-letter month name      Feb
	#MM#       2-digit month number     02
	#M#        month number             2
	#DDDD#     full weekday name        Wednesday
	#DDD#      3-letter weekday name    Wed
	#DD#       2-digit day number       09
	#D#        day number               9
	#th#       day ordinal suffix       nd
	#hhhh#     2 digit military hour    17
	#hhh#      military/24-based hour   17
	#hh#       2-digit hour             05
	#h#        hour                     5
	#mm#       2-digit minute           07
	#m#        minute                   7
	#ss#       2-digit second           09
	#s#        second                   9
	#ampm#     "am" or "pm"             pm
	#AMPM#     "AM" or "PM"             PM


notes:
	If you want the current date and time, use "new Date()".
	e.g.
	var curDate = new Date();
	curDate.customFormat("#DD#/#MM#/#YYYY#");


	If you want all-lowercase or all-uppercase versions of the weekday/month,
	use the toLowerCase() or toUpperCase() methods of the resulting string.
	e.g.
	curDate.customFormat("#DDDD#, #MMMM# #D#, #YYYY#").toLowerCase();

	If you use the same format in many places in your code, I suggest creating
	a wrapper function to this one, e.g.:
	Date.prototype.myDate=function(){
		return this.customFormat("#D#-#MMM#-#YYYY#").toLowerCase();
	}
	Date.prototype.myTime=function(){
		return this.customFormat("#h#:#mm##ampm#");
	}

	var now = new Date();
	alert(now.myDate());


examples:
	var now = new Date();
	var myString = now.customFormat("#YYYY#-#MM#-#DD#");
	alert(myString);
	-->1999-11-19

	var myString = now.customFormat("#DDD#, #MMM#-#D#-#YY#");
	alert(myString);
	-->Fri, Nov-19-99

	var myString = now.customFormat("#h#:#mm# #ampm#");
	alert(myString);
	-->4:34 pm

	var myString = now.customFormat("#hhh#:#mm#:#ss#");
	alert(myString);
	-->16:34:26

	var myString = now.customFormat("#DDDD#, #MMMM# #D##th#, #YYYY# @ #h#:#mm# #ampm#");
	alert(myString);
	-->Friday, November 19th, 1999 @ 4:34 pm

****************************************************************************/
