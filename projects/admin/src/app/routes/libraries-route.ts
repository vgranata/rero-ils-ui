/*
 * RERO ILS UI
 * Copyright (C) 2020 RERO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { DetailComponent, RecordSearchPageComponent, RouteInterface } from '@rero/ng-core';
import { CanUpdateGuard } from '../guard/can-update.guard';
import { RoleGuard } from '../guard/role.guard';
import { LibrariesBriefViewComponent } from '../record/brief-view/libraries-brief-view.component';
import { LibraryComponent } from '../record/custom-editor/libraries/library.component';
import { LibraryDetailViewComponent } from '../record/detail-view/library-detail-view/library-detail-view.component';
import { BaseRoute } from './base-route';

export class LibrariesRoute extends BaseRoute implements RouteInterface {

  /** Route name */
  readonly name = 'libraries';

  /** Record type */
  readonly recordType = 'libraries';

  /**
   * Get Configuration
   * @return Object
   */
  getConfiguration() {
    return {
      matcher: (url: any) => this.routeMatcher(url, this.name),
      children: [
        { path: '', component: RecordSearchPageComponent },
        { path: 'detail/:pid', component: DetailComponent },
        { path: 'edit/:pid', component: LibraryComponent, canActivate: [CanUpdateGuard] },
        { path: 'new', component: LibraryComponent, canActivate: [RoleGuard], data: { roles: ['system_librarian'] } }
      ],
      data: {
        types: [
          {
            key: this.name,
            label: 'Libraries',
            component: LibrariesBriefViewComponent,
            detailComponent: LibraryDetailViewComponent,
            searchFilters: [
              this.expertSearchFilter()
            ],
            canAdd: () => this._routeToolService.canSystemLibrarian(),
            permissions: (record: any) => this._routeToolService.permissions(record, this.recordType),
            preCreateRecord: (data: any) => {
              const user = this._routeToolService.userService.user;
              data.organisation = {
                $ref: this._routeToolService.apiService.getRefEndpoint(
                  'organisations',
                  user.currentOrganisation
                )
              };
              return data;
            },
            sortOptions: [
              {
                label: _('Relevance'),
                value: 'bestmatch',
                defaultQuery: true
              },
              {
                label: _('Name'),
                value: 'name',
                defaultNoQuery: true
              },
              {
                label: _('Code'),
                value: 'code'
              }
            ]
          }
        ]
      }
    };
  }
}
