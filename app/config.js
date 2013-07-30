define([],
	function ()
	{
		_configOptions = {
			//id for overview web map; this is the map that contains the content point layer
			webmap_overview: "930979c835f44746b67538b9cd4d2d04",
			//layer in overview webmap which provides the countdown content
			//title should be readable from ArcGIS.com viewer TOC
			contentLayer: "AAPA_PORT_RANKINGS", 
			//id for satellite (or intended large scale) web map
			webmap_largescale: "08c8c7870b2d44e7822548cb3cc6c057", 
			//Enter a title, if no title is specified, the webmap's title is used.
			title: "Giant container ports stitch together the global economy",
			//Enter a subtitle, if not specified the ArcGIS.com web map's summary is used
			subtitle: "The fifty largest ports link six continents and countless supply chains."
		}
	}
);