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
import { FormlyFieldConfig } from '@ngx-formly/core';
import {
  DetailComponent, EditorComponent, extractIdOnRef, JSONSchema7, Record, RecordSearchPageComponent, RecordService, RouteInterface
} from '@rero/ng-core';
import { map } from 'rxjs/operators';
import { CanUpdateGuard } from '../guard/can-update.guard';
import { CollectionBriefViewComponent } from '../record/brief-view/collection-brief-view.component';
import { CollectionDetailViewComponent } from '../record/detail-view/collection-detail-view/collection-detail-view.component';
import { BaseRoute } from './base-route';

export class CollectionsRoute extends BaseRoute implements RouteInterface {

  /** Route name */
  readonly name = 'collections';

  /** Record type */
  readonly recordType = 'collections';

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
        { path: 'edit/:pid', component: EditorComponent, canActivate: [CanUpdateGuard] },
        { path: 'new', component: EditorComponent }
      ],
      data: {
        types: [
          {
            key: this.name,
            label: 'Exhibition/course',
            component: CollectionBriefViewComponent,
            detailComponent: CollectionDetailViewComponent,
            searchFilters: [
              this.expertSearchFilter()
            ],
            canAdd: () => this._routeToolService.can(),
            permissions: (record: any) => this._routeToolService.permissions(record, this.recordType),
            aggregationsOrder: ['type', 'library', 'teacher', 'subject'],
            aggregationsExpand: ['type'],
            preprocessRecordEditor: (record: any) => {
              const user = this._routeToolService.userService.user;
              if (!record.pid) {
                // set the user's default library at the time of creation
                record.libraries = [];
                record.libraries.push({
                  $ref: this._routeToolService.apiService.getRefEndpoint(
                    'libraries',
                    user.currentLibrary
                  )
                });
              }
              return record;
            },
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
            formFieldMap: (field: FormlyFieldConfig, jsonSchema: JSONSchema7): FormlyFieldConfig => {
              const formOptions = jsonSchema.form;
              if (formOptions && formOptions.hasOwnProperty('fieldMap')) {
                switch (formOptions.fieldMap) {
                  case 'library':
                    return this.populateLibrariesByCurrentUser(field);
                }
              }
              return field;
            },
            listHeaders: {
              Accept: 'application/rero+json, application/json'
            },
            sortOptions: [
              {
                label: _('Relevance'),
                value: 'bestmatch',
                defaultQuery: true
              },
              {
                label: _('Title'),
                value: 'title',
                defaultNoQuery: true
              }
            ]
          }
        ]
      }
    };
  }

  /**
   * Populate select menu with libraries of current user library
   * @param field - FormlyFieldConfig
   * @return FormlyFieldConfig
   */
  private populateLibrariesByCurrentUser(field: FormlyFieldConfig): FormlyFieldConfig {
    field.type = 'select';
    field.hooks = {
      ...field.hooks,
      afterContentInit: (f: FormlyFieldConfig) => {
        const recordService = this._routeToolService.recordService;
        const apiService = this._routeToolService.apiService;
        const libraryPid = this._routeToolService.userService.user.currentLibrary;
        let query = '';
        if (!this._routeToolService.userService.user.isSystemLibrarian) {
          // On edit record
          if (f.formControl.value) {
            const selectLibraryPid = extractIdOnRef(f.formControl.value);
            query = `pid:${selectLibraryPid}`;
            // If the current value is not the current librarian library
            // Deactivating the select menu
            if (selectLibraryPid !== libraryPid) {
              f.templateOptions.disabled = true;
            }
          } else {
            query = `pid:${libraryPid}`;
          }
        }
        f.templateOptions.options = recordService.getRecords(
          'libraries',
          query, 1,
          RecordService.MAX_REST_RESULTS_SIZE,
          undefined,
          undefined,
          undefined,
          'name'
        ).pipe(
          map((result: Record) => result.hits.total === 0 ? [] : result.hits.hits),
          map(hits => {
            return hits.map((hit: any) => {
              return {
                label: hit.metadata.name,
                value: apiService.getRefEndpoint(
                  'libraries',
                  hit.metadata.pid
                )
              };
            });
          })
        );
      }
    };
    return field;
  }
}
