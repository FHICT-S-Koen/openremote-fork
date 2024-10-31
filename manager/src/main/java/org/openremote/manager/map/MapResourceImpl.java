/*
 * Copyright 2016, OpenRemote Inc.
 *
 * See the CONTRIBUTORS.txt file in the distribution for a
 * full listing of individual contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package org.openremote.manager.map;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.openremote.container.web.WebResource;
import org.openremote.manager.security.ManagerIdentityService;
import org.openremote.model.http.RequestParams;
import org.openremote.model.manager.MapRealmConfig;
import org.openremote.model.map.MapResource;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.util.Map;

public class MapResourceImpl extends WebResource implements MapResource {

    protected final MapService mapService;
    protected final ManagerIdentityService identityService;

    public MapResourceImpl(MapService mapService, ManagerIdentityService identityService) {
        this.mapService = mapService;
        this.identityService = identityService;
    }

    @Override
    public Object saveSettings(RequestParams requestParams, Map<String, MapRealmConfig> mapConfig) {
        return mapService.saveMapConfig(mapConfig);
    }

    @Override
    public ObjectNode getSettings(RequestParams requestParams) {
        return mapService.getMapSettings(
            getRequestRealmName(),
            requestParams.getExternalSchemeHostAndPort()
        );
    }

    @Override
    public ObjectNode getSettingsJs(RequestParams requestParams) {
        return mapService.getMapSettingsJs(
            getAuthenticatedRealmName(),
            requestParams.getExternalSchemeHostAndPort()
        );
    }

    @Override
    public byte[] getTile(int zoom, int column, int row) {
        byte[] tile = mapService.getMapTile(zoom, column, row);
        if (tile != null) {
            return tile;
        } else {
            throw new WebApplicationException(Response.Status.NO_CONTENT);
        }
    }

    // @Override
    // public byte[] getExternalTile(HttpServerExchange exchange) {
    //     LOG.info("TESTTING CALL PROXY WRAPPER");
    //     // consider caching proxy handlers in an array

    //     UriBuilder tileServerUri = UriBuilder.fromPath("/")
    //         .scheme("http")
    //         .host(tileServerHost)
    //         .port(tileServerPort);

    //     @SuppressWarnings("deprecation")
    //     ProxyHandler proxyHandler = new ProxyHandler(
    //             new io.undertow.server.handlers.proxy.SimpleProxyClientProvider(tileServerUri.build()),
    //             getInteger(container.getConfig(), OR_MAP_TILESERVER_REQUEST_TIMEOUT, OR_MAP_TILESERVER_REQUEST_TIMEOUT_DEFAULT),
    //             ResponseCodeHandler.HANDLE_404
    //     ).setReuseXForwarded(true);

    //     // Change request path to match what the tile server expects
    //     String path = exchange.getRequestPath().substring(RASTER_MAP_TILE_PATH.length());

    //     exchange.setRequestURI(TILESERVER_TILE_PATH + path, true);
    //     exchange.setRequestPath(TILESERVER_TILE_PATH + path);
    //     exchange.setRelativePath(TILESERVER_TILE_PATH + path);
    //     proxyHandler.handleRequest(exchange);
    //     proxyHandler.handleRequest(exchange);

    //     proxyHandler.;
        
    //     // // webService.getRequestHandlers().add(0, pathStartsWithHandler("Custom Map Tile Proxy", "/custom_map/tile", exchange -> {
    //     // //     LOG.info("TESTTING CALL PROXY WRAPPER");
    //     // //     // consider caching proxy handlers in an array

    //     // //     getRequestRealmName()

    //     // //     UriBuilder tileServerUri = UriBuilder.fromPath("/")
    //     // //     .scheme("http")
    //     // //     .host(tileServerHost)
    //     // //     .port(tileServerPort);

    //     // //     @SuppressWarnings("deprecation")
    //     // //     ProxyHandler proxyHandler = new ProxyHandler(
    //     // //             new io.undertow.server.handlers.proxy.SimpleProxyClientProvider(tileServerUri.build()),
    //     // //             getInteger(container.getConfig(), OR_MAP_TILESERVER_REQUEST_TIMEOUT, OR_MAP_TILESERVER_REQUEST_TIMEOUT_DEFAULT),
    //     // //             ResponseCodeHandler.HANDLE_404
    //     // //     ).setReuseXForwarded(true);

    //     // //     // Change request path to match what the tile server expects
    //     // //     String path = exchange.getRequestPath().substring(RASTER_MAP_TILE_PATH.length());

    //     // //     exchange.setRequestURI(TILESERVER_TILE_PATH + path, true);
    //     // //     exchange.setRequestPath(TILESERVER_TILE_PATH + path);
    //     // //     exchange.setRelativePath(TILESERVER_TILE_PATH + path);
    //     // //     proxyHandler.handleRequest(exchange);
    //     // // }));
    // }
}
