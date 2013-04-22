dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("esri.arcgis.utils");
dojo.require("esri.map");

/******************************************************
***************** begin config section ****************
*******************************************************/

var TITLE = "World's Largest Container Ports"
var BYLINE = "This is the byline"
var WEBMAP_ID = "3732b8a6d0bc4a09b00247e8daf69af8";
var LOCATIONS_LAYER_TITLE = "AAPA_PORT_RANKINGS_2011_1999_edited";
var GEOMETRY_SERVICE_URL = "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer";

var BASEMAP_SERVICE_NATGEO = "http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer";
var BASEMAP_SERVICE_SATELLITE = "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";


/******************************************************
***************** end config section ******************
*******************************************************/

var _map;
var _mapOV;
var _scroll;
var _sourceLayer;
var _locations;
var _selected;

var _lutIconSpecs = {
	normal:new IconSpecs(22,28,3,8),
	medium:new IconSpecs(24,30,3,8),
	large:new IconSpecs(32,40,3,11)
}

var ICON_PREFIX = "resources/icons/red/NumberIcon";
var ICON_SUFFIX = ".png";

var _dojoReady = false;
var _jqueryReady = false;

var _homeExtent; // set this in init() if desired; otherwise, it will 
				 // be the default extent of the web map;

var _isMobile = isMobile();

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
	
	// determine whether we're in embed mode
	
	var queryString = esri.urlToObject(document.location.href).query;
	if (queryString) {
		if (queryString.embed) {
			if (queryString.embed.toUpperCase() == "TRUE") {
				_isEmbed = true;
				$("#header").height(0);
				$("#zoomToggle").css("top", "55px");
				$("body").css("min-width","600px");
				$("body").css("min-height","500px");			
				$("body").width(600);
				$("body").height(400);
			}
		}
	}
	
	// jQuery event assignment
	
	$(this).resize(handleWindowResize);
	
	$("#zoomIn").click(function(e) {
        _map.setLevel(_map.getLevel()+1);
    });
	$("#zoomOut").click(function(e) {
        _map.setLevel(_map.getLevel()-1);
    });
	$("#zoomExtent").click(function(e) {
        _map.setExtent(_homeExtent);
    });
	
	$("#topRow").click(function(e) {
        pageUp();
    });

	$("#bottomRow").click(function(e) {
        pageDown();
    });
	
	$("#title").append(TITLE);
	$("#subtitle").append(BYLINE);	
	
	$(document).keydown(function(e){
		
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
		highlightTab($("#scroller li").eq(index));
		scrollToPage(index);	

	});	
	
	_map = new esri.Map("map");
	_map.addLayer(new esri.layers.ArcGISTiledMapServiceLayer(BASEMAP_SERVICE_SATELLITE));
	_map.setLevel(7);

	var mapDeferred = esri.arcgis.utils.createMap(WEBMAP_ID, "mapOV", {
		mapOptions: {
			slider: false,
			wrapAround180: false,
			extent:_homeExtent
		},
		ignorePopups: true,
		geometryServiceURL: GEOMETRY_SERVICE_URL
	});
	
	mapDeferred.addCallback(function(response) {	  

		_mapOV = response.map;
		
		// event handler for graphics
		dojo.connect(_mapOV.graphics, "onMouseOver", layer_onMouseOver);
		dojo.connect(_mapOV.graphics, "onMouseOut", layer_onMouseOut);
		dojo.connect(_mapOV.graphics, "onClick", layer_onClick);		
				
		_sourceLayer = $.grep(
			response.itemInfo.itemData.operationalLayers,
			function(n,i){
				return $.trim(n.title).toLowerCase() == $.trim(LOCATIONS_LAYER_TITLE).toLowerCase()
			})[0].featureCollection.layers[0];
		
		var locationsService = new LocationsParserService();
		var numDiv;
		var nameDiv;
		var li;		  

		locationsService.process(_sourceLayer.featureSet.features, function(locations){
			_locations = locations;
			var spec = _lutIconSpecs.normal;
			$.each(_locations, function(index, value) {
				value.setSymbol(new esri.symbol.PictureMarkerSymbol(
					ICON_PREFIX+value.attributes.getRank()+ICON_SUFFIX, 
					spec.getWidth(), 
					spec.getHeight()).setOffset(spec.getOffsetX(), spec.getOffsetY())
				);
			   _mapOV.graphics.add(value);
			   numDiv = $("<div class='numberDiv'>"+value.attributes.getRank()+"</div>");
			   nameDiv = $("<div class='nameDiv'><span style='margin-left:20px'>"+value.attributes.getName()+"</span></div>");
			   li = $("<li></li>");
			   $(li).append(numDiv);
			   $(li).append(nameDiv);
			   $("#thelist").append(li);
			});
		});
		
		_scroll = new iScroll('wrapper', {snap:'li',momentum:true});	
	
			
		$("li").click(function(e) 
		{
			if ($(this).find(".numberDiv").hasClass("selected")) {
				backToList();
			} else {
				
				highlightTab(this);
				
				var index = $.inArray(this, $("#scroller li"));
				preSelection();
				_selected = _locations[index];
				postSelection();

				reveal();				
				
			}
		});
		
		if(_mapOV.loaded){
			initMap();
		} else {
			dojo.connect(_mapOV,"onLoad",function(){
				initMap();
			});
		}
				
	});
	
}

function scrollToPage(index)
{
	_scroll.scrollToPage(0, index, 500);
}

function pageDown()
{
	var div = Math.floor($("#wrapper").height() / 41);
	_scroll.scrollTo(0, div * 41, 200, true);
}

function pageUp()
{
	var div = -Math.floor($("#wrapper").height() / 41);
	_scroll.scrollTo(0, div * 41, 200, true);
}

function reveal()
{
	setTimeout(function(){$("#blot").animate({left:40},"slow",null,function(){
		_mapOV.resize();
	})}, 400);	
}

function highlightTab(tab) 
{
	$("li .nameDiv").removeClass("selected");
	$("li .numberDiv").removeClass("selected");
	$(tab).find(".numberDiv").addClass("selected");
	$(tab).find(".nameDiv").addClass("selected");
}

function initMap() {

	_mapOV.removeLayer(_mapOV.getLayer(_sourceLayer.id));	
	_mapOV.setLevel(7);
	
	// if _homeExtent hasn't been set, then default to the initial extent
	// of the web map.  On the other hand, if it HAS been set AND we're using
	// the embed option, we need to reset the extent (because the map dimensions
	// have been changed on the fly).

	if (!_homeExtent) {
		_homeExtent = _map.extent;
	} else {
		if (_isEmbed) {
			setTimeout(function(){
				_map.setExtent(_homeExtent)
			},500);
		}	
	}
	
	handleWindowResize();
	
	$("#case #blot").css("left", $("#case").width());
	
	preSelection();
	_selected = _locations[0];
	postSelection();
	highlightTab($("#scroller li").eq(0));
	reveal();

}

function layer_onClick(event)
{
	preSelection();
	_selected = event.graphic;
	var index = $.inArray(_selected, _locations);
	highlightTab($("#scroller li").eq(index));
	scrollToPage(index);	
	postSelection();
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
	$("#hoverInfo").html(graphic.attributes.getName());
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
	
	$("#leftPane").height($("body").height() - $("#header").height());
	$("#leftPane").width(parseInt($("body").width() * .4));

	$("#case").height($("#leftPane").height());

	$("#case #table").height($("#case").height());
	$("#case #table #wrapper #scroller .nameDiv").width($("#leftPane").width() - $("#case #wrapper #scroller .numberDiv").width()); 
	
	
	$("#case #wrapper").height($("#case").height() - $("#topRow").height() - $("#bottomRow").height() - 3);
	$("#case #blot").width($("#leftPane").width() - 40);	
	$("#case #blot").height($("#leftPane").height());
		
	$("#map").height($("body").height() - $("#header").height());
	$("#map").width($("body").width() - $("#leftPane").width() - parseInt($("#leftPane").css("border-right-width")));
	$("#case #blot #inner").height($("#case #blot").height() - (parseInt($("#case #blot #inner").css("margin-top")) + parseInt($("#case #blot #inner").css("margin-bottom"))));
	
	$("#mapOV").width($("#case #blot #inner").width());
	$("#mapOV").height($("#case #blot #inner").height() - $("#case #blot #label").height() - parseInt($("#case #blot #inner").css("margin-top")));
	
	_map.resize();
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
	
	if (_map.getLevel() == 15) {
		_map.centerAt(_selected.geometry);
	}
	else {
		_map.centerAndZoom(_selected.geometry, 15);
	}
	
	_mapOV.centerAt(_selected.geometry);	
		
	// make the selected location's icon BIG
	var height = _lutIconSpecs["large"].getHeight();
	var width = _lutIconSpecs["large"].getWidth();
	var offset_x = _lutIconSpecs["large"].getOffsetX()
	var offset_y = _lutIconSpecs["large"].getOffsetY();
	
	_selected.setSymbol(_selected.symbol.setHeight(height).setWidth(width).setOffset(offset_x, offset_y));
	
	$("#label").empty();
	$("#label").append("<span class='number'>"+_selected.attributes.getRank()+"</span> <span class='title'>"+_selected.attributes.getName()+"</span>");			
	
	setTimeout(function(){moveGraphicToFront(_selected)},500);
	
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
