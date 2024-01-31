// @ts-expect-error - no types for turf are findable _shrug_
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { FeatureCollection, GeoJsonProperties, Point } from 'geojson';
const baseUrl = 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/';
const geojsonQuery = '/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=pgeojson';

export interface DistrictSourceItem {
  name: string;
  url: string;
  featColl: FeatureCollection;
}
export const DistrictSources: Array<Omit<DistrictSourceItem, 'featColl'>> = [
  {
    name: 'State Assembly Districts',
    url: `${baseUrl}NYC_State_Assembly_Districts_Water_Included${geojsonQuery}`,
  },
  {
    name: 'NYC Congressional Districts',
    url: `${baseUrl}NYC_Congressional_Districts_Water_Included${geojsonQuery}`,
  },
  {
    name: 'State Senate Districts',
    url: `${baseUrl}NYC_State_Senate_Districts_Water_Included${geojsonQuery}`,
  },
  {
    name: 'Community Districts',
    url: `${baseUrl}NYC_Community_Districts_Water_Included${geojsonQuery}`,
  },
  {
    name: 'City Council Districts',
    url: `${baseUrl}NYC_City_Council_Districts_Water_Included${geojsonQuery}`,
  },
  {
    name: 'Police Precincts',
    url: `https://data.cityofnewyork.us/api/geospatial/78dh-3ptz?method=export&format=GeoJSON`,
  },
];

export function DistrictFormatter(p: GeoJsonProperties, name: string) {
  const getBoro = (boro: string) => {
    switch (boro.substring(0, 1)) {
      case '1':
        return 'Manhattan';
      case '2':
        return 'Bronx';
      case '3':
        return 'Brooklyn';
      case '4':
        return 'Queens';
      case '5':
        return 'Staten Island';
      default:
        return 'Unknown';
    }
  };
  const formatterTable = {
    'State Assembly Districts': (p: GeoJsonProperties) => `State Assembly District ${p!.AssemDist}`, // OBJECTID: 20, AssemDist: 43
    'NYC Congressional Districts': (p: GeoJsonProperties) => `Congressional District ${p!.CongDist}`, // OBJECTID: 7, CongDist: 10
    'State Senate Districts': (p: GeoJsonProperties) => `State Senate District ${p!.StSenDist}`, // OBJECTID: 11, StSenDist: 25
    'Community Districts': (p: GeoJsonProperties) => {
      // {OBJECTID: 31, BoroCD: 355
      const bcd = '' + (p!.BoroCD as number);
      return `Community District ` + getBoro(bcd) + ' ' + ('' + +bcd.substring(1));
    },
    'City Council Districts': (p: GeoJsonProperties) => `City Council District ${p!.CounDist}`, // OBJECTID: 51, CounDist: 47
    'Police Precincts': (p: GeoJsonProperties) => `Police precinct ${p!.precinct}`,
  };
  return formatterTable[name as keyof typeof formatterTable](p);
}

export async function getData() {
  const data: Array<DistrictSourceItem> = [];
  for (const district of DistrictSources) {
    const { url } = district;
    const response = await fetch(url);
    try {
      const json = await response.json();
      const item = {
        featColl: json,
        ...district,
      };
      data.push(item);
    } catch (error) {
      console.error({ district, error, url });
    }
  }
  return data;
}

export const getSurroudingDistricts = (districts: Array<DistrictSourceItem>, point: Point | Array<number>) =>
  districts.flatMap((district) =>
    district.featColl.features.flatMap((feature) =>
      booleanPointInPolygon(point, feature.geometry)
        ? [
            {
              properties: feature.properties,
              name: district.name,
              zone: DistrictFormatter!(feature.properties, district.name),
              feature,
            },
          ]
        : [],
    ),
  );
