dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("esri.arcgis.utils");
dojo.require("esri.map");

/******************************************************
***************** begin config section ****************
*******************************************************/

var TITLE = "World's Largest Container Ports"
var BYLINE = "This is the byline"
var WEBMAP_ID = "e119cddd0c1a4ca9b1d87df57d0c62fb";
var LOCATIONS_LAYER_ID = "csv_2334_0";

var BASEMAP_SERVICE_NATGEO = "http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer";
var BASEMAP_SERVICE_SATELLITE = "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";

/******************************************************
***************** end config section ******************
*******************************************************/

var _mapSat;
var _mapOV;
var _scroll;
var _sourceLayer;
var _locations;
var _selected;
var _popup;

var _divMapRight;
var _divMapLeft;

var _lutIconSpecs = {
	normal:new IconSpecs(22,28,3,8),
	medium:new IconSpecs(24,30,3,8),
	large:new IconSpecs(32,40,3,11)
}

var ICON_PREFIX = "resources/icons/red/NumberIcon";
var ICON_SUFFIX = ".png";

var _dojoReady = false;
var _jqueryReady = false;

var _isMobile = isMobile();
var _isLegacyIE = ((navigator.appVersion.indexOf("MSIE 8") > -1) || (navigator.appVersion.indexOf("MSIE 8") > -1));

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

	$("#title").append(TITLE);
	$("#subtitle").append(BYLINE);	
		
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
		
	_mapSat = new esri.Map("map");
	_mapSat.addLayer(new esri.layers.ArcGISTiledMapServiceLayer(BASEMAP_SERVICE_SATELLITE));
	_mapSat.setLevel(7);
	
	_popup = new esri.dijit.Popup(null, dojo.create("div"));

	var mapDeferred = esri.arcgis.utils.createMap(WEBMAP_ID, "mapOV", {
		mapOptions: {
			slider: true,
			wrapAround180: true
		},
		ignorePopups: false,
		infoWindow: _popup	
	});
	
	mapDeferred.addCallback(function(response) {	  

		_mapOV = response.map;		
		_mapOV.graphics.hide();	

		_sourceLayer = _mapOV.getLayer(LOCATIONS_LAYER_ID);
		_locations = _sourceLayer.graphics;
		
		loadList();
		
		if (!_isLegacyIE) {
			_scroll = new iScroll('wrapper', {snap:'li',momentum:true});
		} else {
			$("#wrapper").css("overflow", "hidden");
			$("#thelist").css("overflow", "hidden");
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

	_mapOV.setLevel(2);
	
	handleWindowResize();
	
	$("#case #blot").css("left", $("#case").width());
	
	switchMaps();

	setTimeout(function(){
		if(_scroll){_scroll.refresh()}
		_mapSat.centerAt(new esri.geometry.Point(0,0,new esri.SpatialReference(4326)));
		_mapOV.centerAt(new esri.geometry.Point(0,0,new esri.SpatialReference(4326)));		
	},500);

	// jQuery event assignment
	
	$(this).resize(handleWindowResize);
	
	$("#topRow .numberDiv").click(function(e) {
		pageUp();
	});
	
	$("#topRow #iconList").click(function(e) {
		backToList();
	});

	$("#bottomRow .numberDiv").click(function(e) {
		pageDown();
	});
	
	$(document).keydown(onKeyDown);	
			
	$("li").click(listItemClick);
	
	$("#switchMaps").click(function(e) {
		switchMaps();
	});		

	$("#mapOV").hover(function(e) {
		$("#mapOV .esriSimpleSlider").fadeIn();
	},function(e) {
		$("#mapOV .esriSimpleSlider").fadeOut();
	})

}

function transfer()
{
	var arr = $.grep(_sourceLayer.graphics, function(n, i){
		return n.attributes.PORT == _selected.attributes.PORT
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
	if ($(this).find(".numberDiv").hasClass("selected")) {
		backToList();
	} else {
		
		highlightTab(this);
		
		var index = $.inArray(this, $("#thelist li"));
		preSelection();
		_selected = _locations[index];
		postSelection();

		reveal();				
		
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

function reveal()
{
	setTimeout(function(){$("#blot").animate({left:40},"slow",null,function(){
		_mapOV.resize(); transfer();
	})}, 400);	
}

function switchMaps()
{
	
	if ($(_divMapRight).attr("id") == $("#map").attr("id")) {
		_divMapRight = $("#mapOV");
		_divMapLeft = $("#map");
	} else {
		_divMapRight = $("#map");
		_divMapLeft = $("#mapOV");
	}
	
	$(_divMapRight).detach();
	$(_divMapLeft).detach();
	
	$("#inner").append(_divMapLeft);
	$(_divMapRight).insertAfter($("#leftPane"));
	
	handleWindowResize();
	
	if (_selected) {
		setTimeout(function(){
			_mapSat.centerAt(_selected.geometry);
			_mapOV.centerAt(_selected.geometry);
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
			ICON_PREFIX+value.attributes.RANK+ICON_SUFFIX, 
			spec.getWidth(), 
			spec.getHeight()).setOffset(spec.getOffsetX(), spec.getOffsetY())
		);
	   numDiv = $("<div class='numberDiv'>"+value.attributes.RANK+"</div>");
	   nameDiv = $("<div class='nameDiv'><span style='margin-left:20px'>"+value.attributes.PORT+", "+value.attributes.COUNTRY+"</span></div>");
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
	reveal();
}

function layer_onMouseOver(event)
{
	if (_isMobile) return;	
	var graphic = event.graphic;
	var spec = _lutIconSpecs.medium;
	if (graphic != _selected) {
		graphic.setSymbol(graphic.symbol.setHeight(spec.getHeight()).setWidth(spec.getWidth()).setOffset(spec.getOffsetX(), spec.getOffsetY()));
	}
	moveGraphicToFront(graphic);	
	_mapOV.setMapCursor("pointer");
	$("#hoverInfo").html(graphic.attributes.PORT);
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
	
	if (($("body").height() <= 500) || ($("body").width() <= 900)) $("#header").height(0);
	else $("#header").height(115);

	var mapView, mapNav;
	if ($("#inner").find("#mapOV").length > 0) {
		mapView = $("#map");
		mapNav = $("#mapOV");
	} else {
		mapView = $("#mapOV");
		mapNav = $("#map");
	}
	
	$("#leftPane").height($("body").height() - $("#header").height());
	$("#leftPane").width(parseInt($("body").width() * .4));
	if ($("#leftPane").width() > 300) $("#leftPane").width(300);

	$("#case").height($("#leftPane").height());

	$("#case #table").height($("#case").height());
	$("#case #table #wrapper .nameDiv").width($("#leftPane").width() - $("#case #wrapper .numberDiv").width()); 
	
	$("#case #wrapper").height($("#case").height() - $("#topRow").height() - $("#bottomRow").height() - 3);
	$("#case #blot").width($("#leftPane").width() - 40);	
	$("#case #blot").height($("#leftPane").height() - $("#topRow").height() - 21);
		
	$(mapView).height($("body").height() - $("#header").height());
	$(mapView).width($("body").width() - $("#leftPane").width() - parseInt($("#leftPane").css("border-right-width")));
	
	$("#case #blot #inner").height($("#case #blot").height() - (parseInt($("#case #blot #inner").css("margin-top")) + parseInt($("#case #blot #inner").css("margin-bottom"))));
	
	$(mapNav).width($("#case #blot #inner").width());
	$(mapNav).height($("#case #blot #inner").height() - ($("#case #blot #info").height() + parseInt($("#case #blot #inner").css("margin-top"))));
	
	if (!_scroll) {
		$("#thelist").height($("#wrapper").height());
	}
	
	_mapSat.resize();
	_mapOV.resize();
	
}

function preSelection() {
	
	// return the soon-to-be formerly selected graphic icon to normal
	// size
	
	if (_selected) {
		var height = _lutIconSpecs["normal"].getHeight();
		var width = _lutIconSpecs["normal"].getWidth();
		var offset_x = _lutIconSpecs["normal"].getOffsetX()
		var offset_y = _lutIconSpecs["normal"].getOffsetY();
		_selected.setSymbol(_selected.symbol.setHeight(height).setWidth(width).setOffset(offset_x,offset_y));
	}
	
}

function postSelection()
{
	
	if (_mapSat.getLevel() == 15) {
		_mapSat.centerAt(_selected.geometry);
	}
	else {
		_mapSat.centerAndZoom(_selected.geometry, 15);
	}
		
	// make the selected location's icon BIG
	var height = _lutIconSpecs["large"].getHeight();
	var width = _lutIconSpecs["large"].getWidth();
	var offset_x = _lutIconSpecs["large"].getOffsetX()
	var offset_y = _lutIconSpecs["large"].getOffsetY();
	
	_selected.setSymbol(_selected.symbol.setHeight(height).setWidth(width).setOffset(offset_x, offset_y));
	
	$("#label").empty();
	$("#label").append("<span class='number'>"+_selected.attributes.RANK+".</span> <span class='title'>"+_selected.attributes.PORT+", "+_selected.attributes.COUNTRY+"</span>");			
	handleWindowResize();  // because the height of the label may have changed, the ov map may need resizing...		
	
	transfer();
	
	setTimeout(function(){moveGraphicToFront(_selected);_mapOV.centerAt(_selected.geometry)},500);
	
}


function backToList() 
{
	$(".numberDiv").removeClass("selected");
	$(".nameDiv").removeClass("selected");
	$("#case #blot").animate({left:$("#case").width()});
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
