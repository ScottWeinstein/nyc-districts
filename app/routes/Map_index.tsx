import { Point } from 'geojson';
import { DOMElement, ReactElement, useEffect, useRef, useState } from 'react';

import type { MetaFunction } from '@remix-run/node';
import { json, useLoaderData } from '@remix-run/react';
import { GeocodingControl } from '@maptiler/geocoding-control/maptilersdk';
import '@maptiler/geocoding-control/style.css';
import * as msdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import '@watergis/maplibre-gl-legend/dist/maplibre-gl-legend.css';

// const columbusCircle = [40.76808, -73.98223];

import { getData, getSurroudingDistricts } from '../Districts';

export const loader = async () => {
  const districts = await getData();
  return json({ districts });
};

export const meta: MetaFunction = () => {
  return [{ title: 'NYC Political Districts' }, { name: 'description', content: 'NYC Political District Finder' }];
};
const colorList = ['brown', 'coral', 'blueviolet', 'cyan', 'magenta', 'orange', 'purple'];
export default function MapComp() {
  const ld = useLoaderData<typeof loader>();
  const mapContainer = useRef(null);
  const missingAPIKeyContainer = useRef(null);
  const mapref = useRef<msdk.Map | null>(null);
  const [zoom] = useState(12);
  useEffect(() => {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    msdk.config.apiKey = (window as any).ENV.MAPTILER_KEY;
    if (!msdk.config.apiKey || mapContainer.current === null || ld === undefined) {
      return;
    }
    // for HMR
    if (mapref.current) {
      mapref.current.redraw();
      return;
    }
    if (missingAPIKeyContainer.current) {
      missingAPIKeyContainer.current.remove();
    }
    mapref.current = new msdk.Map({
      container: mapContainer.current,
      style: msdk.MapStyle.TONER,
      geolocate: msdk.GeolocationType.POINT,
      zoom: zoom,
    });
    const map = mapref.current;
    const gc = new GeocodingControl();
    map.addControl(gc, 'top-left');

    let targets: { [index: string]: string } = {};
    let sources: Array<string> = [];
    let legendControl: msdk.IControl | null = null;
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    const MaplibreLegendControl = (window as any).MaplibreLegendControl;
    const legendOptions = {
      showDefault: true,
      showCheckbox: true,
      onlyRendered: false,
      reverseOrder: false,
    };
    const clearDistricts = () => {
      for (const s of sources) {
        map.removeLayer(s);
        map.removeSource(s);
      }
      if (legendControl) {
        map.removeControl(legendControl);
      }
      legendControl = null;
      sources = [];
      targets = {};
    };
    function loadDistricts(p: Point | Array<number>) {
      const myDistricts = getSurroudingDistricts(ld.districts, p);
      let ii = 0;
      for (const district of myDistricts) {
        targets[district.zone] = district.zone;
        map.addSource(district.zone, {
          type: 'geojson',
          data: district.feature,
        });
        map.addLayer({
          id: district.zone,
          source: district.zone,
          type: 'line',
          paint: {
            'line-color': colorList[ii++ % colorList.length],
            'line-width': 3,
          },
        });
        sources.push(district.zone);
      }

      legendControl = new MaplibreLegendControl.MaplibreLegendControl(targets, legendOptions);
      map.addControl(legendControl!, 'bottom-left');
    }

    map.on('load', async () => {
      clearDistricts();
      loadDistricts(map.getCenter().toArray());
    });

    map.on('mousedown', (e) => {
      clearDistricts();
      loadDistricts(e.lngLat.toArray());
    });
  }, [zoom, mapContainer, ld, missingAPIKeyContainer]);

  return (
    <div className="map-wrap relative w-full h-screen">
      <div ref={mapContainer} className="map absolute w-full h-full" id="map" />

      <div className="py-10 border-red-500 border-2" ref={missingAPIKeyContainer}>
        <p>missing API key</p>
      </div>
    </div>
  );
}
