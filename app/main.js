dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("esri.arcgis.utils");
dojo.require("esri.map");

var _mapSat;
var _mapOV;
var _scroll;
var _sourceLayer;
var _locations;
var _selected;
var _popup;

var _divMapRight;
var _divMapLeft;

var _introScroller;

var _lutIconSpecs = {
	normal:new IconSpecs(22,28,3,8),
	medium:new IconSpecs(24,30,3,8),
	large:new IconSpecs(32,40,3,11)
}

var STATE_INTRO = 0;
var STATE_TABLE = 1;
var STATE_INFO = 2;

var _currentState = STATE_INTRO;

var ICON_RED_PREFIX = "resources/icons/red/NumberIcon";
var ICON_RED_SUFFIX = ".png";

var ICON_BLUE_PREFIX = "resources/icons/dim_red/NumberIcon";
var ICON_BLUE_SUFFIX = "d.png";

var _dojoReady = false;
var _jqueryReady = false;

var _isMobile = isMobile();
var _isLegacyIE = ((navigator.appVersion.indexOf("MSIE 8") > -1) || (navigator.appVersion.indexOf("MSIE 7") > -1));
var _isIE = (navigator.appVersion.indexOf("MSIE") > -1)

var _isEmbed = false;

dojo.addOnLoad(function() {_dojoReady = true;init()});
jQuery(document).ready(function() {_jqueryReady = true;init()});

if (document.addEventListener) {
	document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
} else {
	document.attachEvent('touchmove', function (e) { e.preventDefault(); }, false);
}

function init() {
	
	if (!_jqueryReady) return;
	if (!_dojoReady) return;

	_divMapRight = $("#map");
	_divMapLeft = $("#mapOV");
	
	// determine whether we're in embed mode
	
	var queryString = esri.urlToObject(document.location.href).query;
	if (queryString) {
		if (queryString.embed) {
			if (queryString.embed.toUpperCase() == "TRUE") {
				_isEmbed = true;
				$("body").width(600);
				$("body").height(400);
			}
		}
	}
	
	_popup = new esri.dijit.Popup(null, dojo.create("div"));
	
	var mapLargeScale = esri.arcgis.utils.createMap(_configOptions.webmap_largescale, "map", {mapOptions: {slider: true, wrapAround180: true}});
	mapLargeScale.addCallback(function(response) {
		_mapSat = response.map;
		if(_mapSat.loaded){
			initMap();
		} else {
			dojo.connect(_mapSat,"onLoad",function(){
				initMap();
			});
		}
	});

	var mapDeferred = esri.arcgis.utils.createMap(_configOptions.webmap_overview, "mapOV", {
		mapOptions: {
			slider: true,
			wrapAround180: true
		},
		ignorePopups: false,
		infoWindow: _popup	
	});
	
	mapDeferred.addCallback(function(response) {	  
		
		if ((_configOptions.title == null) || (_configOptions.title == "")) _configOptions.title = response.itemInfo.item.title;
		if ((_configOptions.subtitle == null) || (_configOptions.subtitle == "")) _configOptions.subtitle = response.itemInfo.item.snippet;
		
		$("#title").append(_configOptions.title);
		$("#subtitle").append(_configOptions.subtitle);	
		
		_mapOV = response.map;		
		_mapOV.graphics.hide();	

		var sourceID = $.grep(response.itemInfo.itemData.operationalLayers, function(n, i){return n.title == _configOptions.contentLayer})[0].featureCollection.layers[0].id;
		_sourceLayer = _mapOV.getLayer($.grep(_mapOV.graphicsLayerIds, function(n,i){return _mapOV.getLayer(n).id == sourceID})[0]);
		_locations = _sourceLayer.graphics;
		$.each(_locations, function(index, value){value.attributes.getValueCI = getValueCI}); // assign extra method to handle case sensitivity
		
		loadList();
		
		if (_isMobile) {
			_scroll = new iScroll('wrapper', {snap:'li',momentum:true});
			$("#innerIntro").height(1000);
			_introScroller = new iScroll('intro');
		} else {
			$("#wrapper").css("overflow", "hidden");
			$("#thelist").css("overflow-x", "hidden");
			$("#thelist").css("overflow-y", "scroll");			
		}

		$("#mapOV .esriSimpleSlider").hide();	
				
		dojo.connect(_sourceLayer, "onMouseOver", layer_onMouseOver);
		dojo.connect(_sourceLayer, "onMouseOut", layer_onMouseOut);
		dojo.connect(_sourceLayer, "onClick", layer_onClick);			

		if(_mapOV.loaded){
			initMap();
		} else {
			dojo.connect(_mapOV,"onLoad",function(){
				initMap();
			});
		}
				
	});
	
}

function initMap() {
	
	if (!_mapSat || !_mapOV) {
		// kicking out because one of the maps doesn't exist yet...
		return null;
	}
	
	if (!_mapSat.loaded || !_mapOV.loaded) {
		// kicking out because one of the maps hasn't loaded yet...
		return null;
	}
	
    //mark the initial center, because maps are about to get resized, 
	//and we may need to re-establish the center.
	initialCenter = _mapOV.extent.getCenter();

	$("#case #blot").css("left", $("#case").width());
	
	switchMaps();

	setTimeout(function(){
		if(_scroll){_scroll.refresh()}
		var level = ($(_divMapRight).width() / $(_divMapRight).height() > 1.2) ? _configOptions.initialZoomLevelWide : _configOptions.initialZoomLevel;
		_mapSat.centerAt(initialCenter);
		if (!_isLegacyIE) {
			_mapOV.centerAndZoom(initialCenter, level);		
			$("#whiteOut").fadeOut("slow");		
		} else {
			_mapOV.centerAndZoom(initialCenter, 12);	
			setTimeout(function(){_mapOV.centerAndZoom(initialCenter, level); $("#whiteOut").fadeOut("slow");}, 1000);	
		}
	},500);

	// jQuery event assignment
	
	$(this).resize(handleWindowResize);
	
	$("#topRow .numberDiv").click(function(e) {
		pageUp();
	});
	
	$("#topRow #iconList").click(function(e) {
		changeState(STATE_TABLE);
	});

	$("#bottomRow .numberDiv").click(function(e) {
		pageDown();
	});
	
	$(document).keydown(onKeyDown);	
			
	$("li").click(listItemClick);
	
	$("#flipper").click(function(e) {
		switchMaps();
	});		

	$("#mapOV").hover(function(e) {
		$("#mapOV .esriSimpleSlider").fadeIn();
	},function(e) {
		$("#mapOV .esriSimpleSlider").fadeOut();
	});
	
	$("#iconHome").click(function(e) {
        changeState(STATE_INTRO);
    });
	
	$("#iconLeft").click(function(e) {
        changeState(STATE_INFO);
    });

}

function transfer()
{
	var arr = $.grep(_sourceLayer.graphics, function(n, i){
		return n.attributes.getValueCI(_configOptions.fieldName_Name) == _selected.attributes.getValueCI(_configOptions.fieldName_Name);
	});
	_mapOV.infoWindow.setFeatures([arr[0]]);
	_mapOV.infoWindow.show();
	$("#info").html($(".contentPane"));
}

function onKeyDown(e)
{
	
	if (!_selected) return;
	
	if ((e.keyCode != 38) && (e.keyCode != 40)) {
		return;
	}

	var index = $.inArray(_selected, _locations);
	index = (e.keyCode == 40) ? index + 1 : index - 1;
	if ((index > _locations.length - 1) || (index < 0)) return; 

	preSelection();
	_selected = _locations[index];
	postSelection();
	highlightTab($("#thelist li").eq(index));
	scrollToPage(index);
	
}

function listItemClick(e) 
{
	if ($(this).find(".numberDiv").hasClass("selected") && (_currentState != STATE_TABLE)) {
		changeState(STATE_TABLE);
	} else {
		
		highlightTab(this);
		
		var index = $.inArray(this, $("#thelist li"));
		preSelection();
		_selected = _locations[index];
		postSelection();

		if (_currentState != STATE_INFO) changeState(STATE_INFO);				
		
	}
}

function scrollToPage(index)
{
	if (_scroll) {
		_scroll.scrollToPage(0, index, 500);
	} else {
		$("#thelist").animate({scrollTop: (index*41)}, 'slow');
	}
}

function pageDown()
{
	var div = Math.floor($("#wrapper").height() / 41);
	if (_scroll) {
		_scroll.scrollTo(0, div * 41, 200, true);
	} else {
		var top = $("#thelist").scrollTop() + (div*41); 
		$("#thelist").animate({scrollTop: top}, 'slow');
	}
}

function pageUp()
{
	var div = Math.floor($("#wrapper").height() / 41);
	if (_scroll) {
		_scroll.scrollTo(0, -div * 41, 200, true);
	} else {
		var currentIndex = Math.floor($("#thelist").scrollTop() / 41);
		var newIndex = currentIndex - div;
		var top = newIndex*41; 
		$("#thelist").animate({scrollTop: top}, 'slow');
	}
}

function reveal(retractIntro)
{
	setTimeout(function(){$("#blot").animate({left:40},"slow",null,function(){
		_mapOV.resize(); 
		_mapSat.resize();
		$("#flipper").fadeIn("slow");
		transfer();
		if (retractIntro) $("#intro").animate({left:500},"slow");				
	})}, 400);	
}

function changeState(toState)
{

	if (toState == STATE_TABLE) {
		if (_currentState == STATE_INTRO) {
			$("#intro").animate({left:500},"slow");
		} else if (_currentState == STATE_INFO) {
			$("#flipper").hide();
			$("#case #blot").animate({left:$("#case").width()});
		} else if (_currentState == STATE_TABLE) {
			// redundant
		} else {
			throwStateException(_currentState);
		}
		$("#iconList").hide();
	} else if (toState == STATE_INFO) {
		if (_currentState == STATE_INTRO) {
			reveal(true);
		} else if (_currentState == STATE_TABLE) {
			reveal(false);
		} else if (_currentState == STATE_INFO) {
			// redundant
		} else {
			throwStateException(_currentState);
		}
		$("#iconLeft").hide();
		$("#iconList").show();
	} else if (toState == STATE_INTRO) {
		if (_currentState == STATE_TABLE) {
			$("#intro").animate({left:41},"slow");
		} else if (_currentState == STATE_INFO) {
			$("#intro").animate({left:41},"slow",function(){
				$("#case #blot").animate({left:$("#case").width()});
			});
			$("#flipper").hide();
		} else if (_currentState == STATE_INTRO) {
			// redundant
		} else {
			throwStateException(_currentState)
		}
	} else {
		throwStateException(toState);
	}
	
	_currentState = toState;
	
}

function throwStateException(allegedState)
{
	throw("invalid state: ", allegedState);
}

function switchMaps()
{
	
	var temp = _divMapRight;
	_divMapRight = _divMapLeft;
	_divMapLeft = temp;
	
	$(_divMapRight).detach();
	$(_divMapLeft).detach();
	
	$("#inner").append(_divMapLeft);
	$(_divMapRight).insertAfter($("#leftPane"));
	
	handleWindowResize();
	
	if (_selected) {
		setTimeout(function(){
			_mapSat.centerAt(_selected.geometry);
			_mapOV.centerAt(_selected.geometry);
			setTimeout(function(){
				moveGraphicToFront(_selected);
			},500);
		},500);
	}
	
}

function loadList()
{
	var numDiv;
	var nameDiv;
	var li;	
	var spec = _lutIconSpecs.normal;
	$.each(_locations, function(index, value) {
		value.setSymbol(new esri.symbol.PictureMarkerSymbol(
			ICON_BLUE_PREFIX+value.attributes.getValueCI(_configOptions.fieldName_Rank)+ICON_BLUE_SUFFIX, 
			spec.getWidth(), 
			spec.getHeight()).setOffset(spec.getOffsetX(), spec.getOffsetY())
		);
	   numDiv = $("<div class='numberDiv'>"+value.attributes.getValueCI(_configOptions.fieldName_Rank)+"</div>");
	   $(numDiv).attr("title", "#"+value.attributes.getValueCI(_configOptions.fieldName_Rank)+": "+value.attributes.getValueCI(_configOptions.fieldName_Name));
	   nameDiv = $("<div class='nameDiv'><span style='margin-left:20px'>"+value.attributes.getValueCI(_configOptions.fieldName_Name)+"</span></div>");
	   li = $("<li></li>");
	   $(li).append(numDiv);
	   $(li).append(nameDiv);
	   $("#thelist").append(li);
	});	
}

function highlightTab(tab) 
{
	$("li .nameDiv").removeClass("selected");
	$("li .numberDiv").removeClass("selected");
	$(tab).find(".numberDiv").addClass("selected");
	$(tab).find(".nameDiv").addClass("selected");
}

function layer_onClick(event)
{
	preSelection();
	_selected = event.graphic;
	var index = $.inArray(_selected, _locations);
	highlightTab($("#thelist li").eq(index));
	scrollToPage(index);	
	postSelection();
	if (_currentState != STATE_INFO) changeState(STATE_INFO);
}

function layer_onMouseOver(event)
{
	if (_isMobile) return;	
	var graphic = event.graphic;
	var spec = _lutIconSpecs.medium;
	if (graphic != _selected) {
		graphic.setSymbol(graphic.symbol.setHeight(spec.getHeight()).setWidth(spec.getWidth()).setOffset(spec.getOffsetX(), spec.getOffsetY()));
	}
	if (!_isIE) moveGraphicToFront(graphic);	
	_mapOV.setMapCursor("pointer");
	$("#hoverInfo").html(graphic.attributes.getValueCI(_configOptions.fieldName_Name));
	var pt = _mapOV.toScreen(graphic.geometry);
	hoverInfoPos(pt.x, pt.y);	
}

function layer_onMouseOut(event)
{
	_mapOV.setMapCursor("default");
	$("#hoverInfo").hide();	
	var graphic = event.graphic;
	var spec = _lutIconSpecs.normal;
	if (graphic != _selected) {
		graphic.setSymbol(graphic.symbol.setHeight(spec.getHeight()).setWidth(spec.getWidth()).setOffset(spec.getOffsetX(), spec.getOffsetY()));
	}
}

function handleWindowResize() {
	
	if (($("body").height() <= 600) || ($("body").width() <= 1000)) $("#header").height(0);
	else $("#header").height(115);
	
	$("#leftPane").height($("body").height() - $("#header").height());
	$("#leftPane").width(parseInt($("body").width() * .4));
	if ($("#leftPane").width() > 300) $("#leftPane").width(300);

	$("#case").height($("#leftPane").height());

	$("#case #table").height($("#case").height());
	$("#case #table #wrapper .nameDiv").width($("#leftPane").width() - $("#case #wrapper .numberDiv").width()); 
	
	$("#case #wrapper").height($("#case").height() - $("#topRow").height() - $("#bottomRow").height() - 3);
	$("#case #blot").width($("#leftPane").width() - 40);	
	$("#case #blot").height($("#leftPane").height() - $("#topRow").height() - 21);
	
	$("#intro").width($("#leftPane").width()-70);
	$("#intro").height($("#leftPane").height());
		
	$(_divMapRight).height($("body").height() - $("#header").height());
	$(_divMapRight).width($("body").width() - $("#leftPane").width());
	
	$("#case #blot #inner").height($("#case #blot").height() - (parseInt($("#case #blot #inner").css("margin-top")) + parseInt($("#case #blot #inner").css("margin-bottom"))));
	
	$(_divMapLeft).width($("#case #blot #inner").width());
	$(_divMapLeft).height($("#case #blot #inner").height() - ($("#case #blot #info").height() + parseInt($("#case #blot #inner").css("margin-top"))));
	$("#flipper").css("top", $("#info").height() + ($(_divMapLeft).height() / 2) + ($("#flipper").height() / 2));
	
	if (!_scroll) {
		$("#thelist").height($("#wrapper").height());
	}
	
	if (_mapSat) _mapSat.resize();
	if (_mapOV) _mapOV.resize();
	
}

function preSelection() {
	
	// return the soon-to-be formerly selected graphic icon to normal
	// size
	
	if (_selected) {
		var height = _lutIconSpecs["normal"].getHeight();
		var width = _lutIconSpecs["normal"].getWidth();
		var offset_x = _lutIconSpecs["normal"].getOffsetX()
		var offset_y = _lutIconSpecs["normal"].getOffsetY();
		var url = ICON_BLUE_PREFIX+_selected.attributes.getValueCI(_configOptions.fieldName_Rank)+ICON_BLUE_SUFFIX;
		_selected.setSymbol(_selected.symbol.setHeight(height).setWidth(width).setOffset(offset_x,offset_y).setUrl(url));
	}
	
}

function postSelection()
{

	// this is a work-around because centerAndZoom was causing WAY too many tiles to be fetched.
	_mapSat.getLayer(_mapSat.layerIds[0]).hide();
	_mapSat.setLevel(3)
	var level = _selected.attributes.getValueCI(_configOptions.fieldName_Level);
	if (!level) level = _configOptions.defaultLargeScaleZoomLevel;
	setTimeout(function(){_mapSat.centerAndZoom(_selected.geometry, level);_mapSat.getLayer(_mapSat.layerIds[0]).show()}, 500);
		
	// make the selected location's icon BIG
	var height = _lutIconSpecs["large"].getHeight();
	var width = _lutIconSpecs["large"].getWidth();
	var offset_x = _lutIconSpecs["large"].getOffsetX()
	var offset_y = _lutIconSpecs["large"].getOffsetY();
	var url = ICON_RED_PREFIX+_selected.attributes.getValueCI(_configOptions.fieldName_Rank)+ICON_RED_SUFFIX;	
	
	_selected.setSymbol(_selected.symbol.setHeight(height).setWidth(width).setOffset(offset_x, offset_y).setUrl(url));
	
	transfer();
	
	setTimeout(function(){
		_mapOV.centerAt(_selected.geometry);
		setTimeout(function(){
			moveGraphicToFront(_selected);			
		}, 500)
	},500);
	
}

function hoverInfoPos(x,y){
	if (x <= ($("#map").width())-230){
		$("#hoverInfo").css("left",x+15);
	}
	else{
		$("#hoverInfo").css("left",x-25-($("#hoverInfo").width()));
	}
	if (y >= ($("#hoverInfo").height())+50){
		$("#hoverInfo").css("top",y-35-($("#hoverInfo").height()));
	}
	else{
		$("#hoverInfo").css("top",y-15+($("#hoverInfo").height()));
	}
	$("#hoverInfo").show();
}

function getValueCI(field) {
	var found;
	$.each(this,function(index,value){
		if (index.toUpperCase() == field.toUpperCase()) {
			found = index;
			return false;
		}
	});
	return this[found];	
}