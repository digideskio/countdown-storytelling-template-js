define([],
	function ()
	{
		_configOptions = {
			//Enter a title, if no title is specified, the webmap's title is used.
			//title should be readable from ArcGIS.com viewer TOC
			//title: "Giant container ports stitch together the global economy",
			//Enter a subtitle, if not specified the ArcGIS.com web map's summary is used
			//subtitle: "The fifty largest ports link six continents and countless supply chains.",
			//id for satellite (or intended large scale) web map
			webmap_largescale: "08c8c7870b2d44e7822548cb3cc6c057", 
			//id for overview web map; this is the map that contains the content point layer
			webmap_overview: "930979c835f44746b67538b9cd4d2d04",
			//layer in overview webmap which provides the countdown content
			contentLayer: "AAPA_PORT_RANKINGS", 
			fieldName_Rank: "rank",
			fieldName_Name: "port",
			fieldName_Level: "level", 
			//Initial zoom level for overview map
			initialZoomLevel: 2,
			//Initial zoom level for wider map aspect ratios
			initialZoomLevelWide: 3,
			//If no zoom level is encoded for the feature, use this zoom level when
			defaultLargeScaleZoomLevel: 13,
			showIntro: false,
			popupHeight: 330
		}
	}
);