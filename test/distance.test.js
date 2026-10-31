import { test } from 'node:test';
import assert from 'node:assert/strict';
import { straightDistance, formatDistance, mapUrl } from '../public/distance.js';
test('same point and known equatorial distance', () => {
  assert.equal(straightDistance({lat:0,lon:0},{lat:0,lon:0}),0);
  assert.ok(Math.abs(straightDistance({lat:0,lon:0},{lat:0,lon:1})-111195.08)<1);
  assert.ok(Number.isFinite(straightDistance({lat:90,lon:0},{lat:-90,lon:180})));
});
test('distance units and route coordinates', () => {
  assert.equal(formatDistance(520), '520 m');
  assert.equal(formatDistance(1500), '1.5 km');
  const a={lat:37.55,lon:126.97},b={lat:35.11,lon:129.04};
  const url=new URL(mapUrl(a,b,'driving'));
  assert.equal(url.searchParams.get('route'),'37.55,126.97;35.11,129.04');
  assert.equal(url.searchParams.get('engine'),'fossgis_osrm_car');
  assert.ok(new URL(mapUrl(a,b,'straight')).searchParams.has('bbox'));
});
