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

var USE_ISCROLL = false;


/******************************************************
***************** end config section ******************
*******************************************************/

var _map;
var _mapOV;
var _scroll;
var _sourceLayer;
var _locations;
var _selected;
var _popup;

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
	
	$("#topRow .numberDiv").click(function(e) {
        pageUp();
    });
	
	$("#topRow #iconList").click(function(e) {
		backToList();
	});

	$("#bottomRow .numberDiv").click(function(e) {
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
		highlightTab($("#thelist li").eq(index));
		scrollToPage(index);	

	});	
	
	_map = new esri.Map("map");
	_map.addLayer(new esri.layers.ArcGISTiledMapServiceLayer(BASEMAP_SERVICE_SATELLITE));
	_map.setLevel(7);
	
	_popup = new esri.dijit.Popup(null, dojo.create("div"));

	var mapDeferred = esri.arcgis.utils.createMap(WEBMAP_ID, "mapOV", {
		mapOptions: {
			slider: true,
			wrapAround180: false,
			extent:_homeExtent
		},
		ignorePopups: false,
		infoWindow: _popup,
		geometryServiceURL: GEOMETRY_SERVICE_URL
	});
	
	mapDeferred.addCallback(function(response) {	  

		_mapOV = response.map;		
		_mapOV.graphics.hide();	
				
		_sourceLayer = $.grep(
			response.itemInfo.itemData.operationalLayers,
			function(n,i){
				return $.trim(n.title).toLowerCase() == $.trim(LOCATIONS_LAYER_TITLE).toLowerCase()
			})[0].featureCollection.layers[0];
		_sourceLayer = _mapOV.getLayer(_sourceLayer.id);
		
		var numDiv;
		var nameDiv;
		var li;		  

		_locations = _sourceLayer.graphics;
		var spec = _lutIconSpecs.normal;
		$.each(_locations, function(index, value) {
			value.setSymbol(new esri.symbol.PictureMarkerSymbol(
				ICON_PREFIX+value.attributes.RANK+ICON_SUFFIX, 
				spec.getWidth(), 
				spec.getHeight()).setOffset(spec.getOffsetX(), spec.getOffsetY())
			);
		   numDiv = $("<div class='numberDiv'>"+value.attributes.RANK+"</div>");
		   nameDiv = $("<div class='nameDiv'><span style='margin-left:20px'>"+value.attributes.PORT+"</span></div>");
		   li = $("<li></li>");
		   $(li).append(numDiv);
		   $(li).append(nameDiv);
		   $("#thelist").append(li);
		});
		
		if (USE_ISCROLL) {
			_scroll = new iScroll('wrapper', {snap:'li',momentum:true});
		} else {
			$("#wrapper").css("overflow", "hidden");
			$("#thelist").css("overflow", "hidden");
		}
	
			
		$("li").click(function(e) 
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
		});

		$("#mapOV .esriSimpleSlider").hide();	
		
		$("#mapOV").hover(function(e) {
        	$("#mapOV .esriSimpleSlider").fadeIn();
			console.log("hover");
        },function(e) {
            $("#mapOV .esriSimpleSlider").fadeOut();
        })
		
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
	highlightTab($("#thelist li").eq(0));
	reveal();
	
	setTimeout(function(){transfer()},500);

}

function transfer()
{
	var arr = $.grep(_sourceLayer.graphics, function(n, i){
		return n.attributes.PORT == _selected.attributes.PORT
	});
	_mapOV.infoWindow.setFeatures([arr[0]]);
	_mapOV.infoWindow.show();
	$("#info").append($(".contentPane"));
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

function layer_onClick(event)
{
	preSelection();
	_selected = event.graphic;
	var index = $.inArray(_selected, _locations);
	highlightTab($("#thelist li").eq(index));
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
	
	$("#leftPane").height($("body").height() - $("#header").height());
	$("#leftPane").width(parseInt($("body").width() * .4));

	$("#case").height($("#leftPane").height());

	$("#case #table").height($("#case").height());
	$("#case #table #wrapper .nameDiv").width($("#leftPane").width() - $("#case #wrapper .numberDiv").width()); 
	
	$("#case #wrapper").height($("#case").height() - $("#topRow").height() - $("#bottomRow").height() - 3);
	$("#case #blot").width($("#leftPane").width() - 40);	
	$("#case #blot").height($("#leftPane").height() - $("#topRow").height() - 21);
		
	$("#map").height($("body").height() - $("#header").height());
	$("#map").width($("body").width() - $("#leftPane").width() - parseInt($("#leftPane").css("border-right-width")));
	$("#case #blot #inner").height($("#case #blot").height() - (parseInt($("#case #blot #inner").css("margin-top")) + parseInt($("#case #blot #inner").css("margin-bottom"))));
	
	$("#mapOV").width($("#case #blot #inner").width());
	$("#mapOV").height($("#case #blot #inner").height() - ($("#case #blot #label").height() + $("#case #blot #info").height() + parseInt($("#case #blot #inner").css("margin-top"))));
	
	if (!_scroll) {
		$("#thelist").height($("#wrapper").height());
	}
	
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
