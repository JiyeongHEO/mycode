// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/A2FMEAClassificationTreeTableService
 */
 import app from 'app';
 import appCtxService, { ctx } from 'js/appCtxService';
 import AwPromiseService from 'js/awPromiseService';
 import awTableStateService from 'js/awTableStateService';
 import soaSvc from 'soa/kernel/soaService';
 import uwPropertySvc from 'js/uwPropertyService';
 import awColumnSvc from 'js/awColumnService';
 import awTableSvc from 'js/awTableService';
 import iconSvc from 'js/iconService';
 import viewModelObjectSvc from 'js/viewModelObjectService';
 import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
 import cdm from 'soa/kernel/clientDataModel';
 import awSPLMTableCellRendererFactory from 'js/awSPLMTableCellRendererFactory';
 import tcViewModelObjectService from 'js/tcViewModelObjectService';
 import _ from 'lodash';
 import _t from 'js/splmTableNative';
 import parsingUtils from 'js/parsingUtils';
 import AwcObjectUtil from 'js/AwcObjectUtil';
 import AwcPanelUtil from 'js/AwcPanelUtil';
 import eventBus from 'js/eventBus';
 import treeTableDataService from 'js/treeTableDataService';
 
 
 /**
  * Cached static default AwTableColumnInfo.
  */
 var _treeTableColumnInfos = null;
 /**

 
 /**
  * Map of nodeId of a 'parent' TableModelObject to an array of its 'child' TableModelObjects.
  */
 var _mapNodeId2ChildArray = {};
 
 /**
  * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
  */
 function _getTreeTableColumnInfos(data) {
     if (!_treeTableColumnInfos) {
         _treeTableColumnInfos = _buildTreeTableColumnInfos(data);
     }
 
     return _treeTableColumnInfos;
 }
 
 /**
  * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
  */
 function _buildTreeTableColumnInfos() {
 
     /**
      * Set 1st column to special 'name' column to support tree-table.
      */
 
     var awColumnInfos = [];
     awColumnInfos.push(awColumnSvc.createColumnInfo({
         name: 'object_name',
         displayName: 'Name',
         width: 250,
         minWidth: 150,
         typeName: 'String',
         enableColumnResizing: true,
         enableColumnMoving: false,
         isTreeNavigation: true
        }));
        awColumnInfos.push(awColumnSvc.createColumnInfo({
            name: 'a2LLCount',
            displayName: 'L/L Count',
            width: 50,
            minWidth: 50,
            typeName: 'String'
        }));
        awColumnInfos.push(awColumnSvc.createColumnInfo({
            name: 'a2CategoryCode',
            displayName: 'Category Code',
            width: 80,
            minWidth: 80,
            typeName: 'String'
        }));
        awColumnInfos.push(awColumnSvc.createColumnInfo({
        name: 'object_desc',
        displayName: 'Description',
        width: 250,
        minWidth: 150,
        typeName: 'String'
    }));
     for (var index = 0; index < awColumnInfos.length; index++) {
         var column = awColumnInfos[index];
         column.cellRenderers = [];
         column.cellRenderers.push(_treeCmdCellRender());
     }
          


     return awColumnInfos;
 }
 
 /**
  * Table Command Cell Renderer for PL Table
  */
 var _treeCmdCellRender = function () {
     return {
         action: function (column, vmo, tableElem) {
             var cellContent = awSPLMTableCellRendererFactory.createTreeCellCommandElement(column, vmo, tableElem);
 
             // add event for cell image visibility
             var gridCellImageElement = cellContent.getElementsByClassName(_t.Const.CLASS_GRID_CELL_IMAGE)[0];
             if (gridCellImageElement) {
                 togglePartialVisibility(gridCellImageElement, vmo.visible);
             }
 
             return cellContent;
         },
         condition: function (column) {
             return column.isTreeNavigation === true;
         }
     };
 };
 
 /**
  * Adds/removes partialVisibility class to element.
  *
  * @param {DOMElement} element DOM element for classes
  * @param {Boolean} isVisible for adding/removing class
  */
 var togglePartialVisibility = function (element, isVisible) {
     if (!isVisible) {
         element.classList.add('aw-widgets-partialVisibility');
     } else {
         element.classList.remove('aw-widgets-partialVisibility');
     }
 };
 
 /**
  * @param {AwTableColumnInfoArray} columnInfos - Array of column information objects to use when building the
  *            table rows.
  * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child'
  *            ViewModelTreeNodes.
  * @param {Number} nChildren - The # of child nodes to add to the given 'parent'.
  * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
  */
 function _buildTreeTableStructure(columnInfos, parentNode, nChildren, isLoadAllEnabled) {
     var children = [];
     _mapNodeId2ChildArray[parentNode.id] = children;
     var levelNdx = parentNode.levelNdx + 1;
 
     for (var childNdx = 1; childNdx <= nChildren.length; childNdx++) {
        var classObj = nChildren[childNdx - 1];
        classObj.props.a2LLCount = { uiValues : [String(classObj.props.a2LessonsLearneds.dbValues.length)]};
         
         /**
          * Create a new node for this level. and Create props for it
          */
         var vmNode = exports.createVmNodeUsingNewObjectInfo(nChildren[childNdx - 1], levelNdx, childNdx, isLoadAllEnabled, columnInfos);
         /**
          * Add it to the 'parent' based on its ID
          */
         children.push(vmNode);
     }
 }

 /**
  * function to evaluate if an object contains children
  * @param {objectType} objectType object type
  * @return {boolean} if node contains child
  */
 function containChildren(props, vmNode) {
     var containChild = true;
     //pms: if (props.a2MasterChildrenRef.dbValues.length > 0) {
        if (props.a2Childran.dbValues.length > 0) {
         vmNode.isLeaf = !containChild;
     } else {
         vmNode.isLeaf = containChild;
     }
 }
 
 /**
  * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
  * <P>
  * Note: The paging status is maintained in the 'parent' node.
  *
  * @param {DeferredResolution} deferred -
  * @param {TreeLoadInput} treeLoadInput -
  * @return {Promise} Revolved with a TreeLoadResult object containing result/status information.
  */
  let _getDateOffset = function() {
    return new Date( new Date().getTime() ).getTimezoneOffset() * -1;
};

let getSearchCriteria = (startIndex , purpose )=>{
    let ctx = appCtxService.ctx
    var searchCriteria = {};
    searchCriteria.queryName = '_Classification_getChildTreeObject';

    searchCriteria.typeOfSearch = 'ADVANCED_SEARCH';
    //pms. searchCriteria.object_type= "A2MasterDataObject"   //searchCriteria.searchID = 'A2MASTERDATAOBJECTSEARCH';
    //나. .A2ParentId= "",   
    if(purpose =="all"){ //전체조회
        searchCriteria.A2Id = "*"
    }else{ //root만 조회
        searchCriteria.A2IsRoot= "true";
        
    }
   
    searchCriteria.searchID= "ACDAAUeeZpEhAAR8DAAEhzZpEhAA1649896500386",
    searchCriteria.utcOffset = _getDateOffset().toString();
    //searchCriteria. =ctx.search.totalFound
    if( startIndex > 0 ) {
        searchCriteria.lastEndIndex = String(ctx.search.endIndex);
        searchCriteria.totalObjectsFoundReportedToClient = String(ctx.search.totalFound)
    } else {
        searchCriteria.totalObjectsFoundReportedToClient = '0';
        searchCriteria.lastEndIndex = '0';
    }

    return searchCriteria;
}

let getSoaInput = (startIndex, purpose)=>{
    let tempSoaInput = {
        columnConfigInput :
        {
            clientName: "AWClient",
            clientScopeURI:""
        },
        searchInput:
        {
            providerName: "Awp0SavedQuerySearchProvider",
            searchCriteria: getSearchCriteria(startIndex, purpose),
            maxToLoad: 100,
            maxToReturn: 100,
            startIndex: startIndex,
            searchFilterMap: {
                "WorkspaceObject.object_type": [{
                searchFilterType: "StringFilter",
                stringValue: "A2FMEAClassification"
                }]
            },
        }
    }
    return tempSoaInput;
}


async function _loadTreeTableRows(deferred, treeLoadInput , data) {
     /**
      * Check if this 'parent' is NOT known to be a 'leaf' and has no 'children' yet.
      */
     var parentNode = treeLoadInput.parentNode;
     var targetNode = parentNode;
     
     if (parentNode.id == "top") {
         var policyJson = {
             types: []
         };

        
         let soaInput = getSoaInput(data.startIndex,"");
         //let soaInput2 = getSoaInput(data.startIndex,"all");
         
         if (parentNode.levelNdx < 0) {
             //soaInput.searchInput.searchCriteria.catalogueObjectType = 'Qc0ChecklistSpecification';
            
         }else {
             parentNode.isLeaf = true;
             var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
             var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
             var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;
             var treeLoadResult = awTableSvc.buildTreeLoadResult(treeLoadInput, mockChildNodes, false, true,
                 endReached, null);
             deferred.resolve({
                 treeLoadResult: treeLoadResult
             });
         }
         var isLoadAllEnabled = true;
         var children = [];
         var policyId = propertyPolicySvc.register(policyJson);

        //  try{
            let response = await soaSvc.postUnchecked("Internal-AWS2-2016-03-Finder", 'performSearch', soaInput);
            //let response2 = await soaSvc.postUnchecked("Internal-AWS2-2016-03-Finder", 'performSearch', soaInput2);
            //아래로
            appCtxService.registerCtx('search' , {endIndex : response.endIndex , totalFound : response.totalFound });
            //pms: "a2MasterChildrenRef" , "a2MasterClass", "object_desc"
               await AwcObjectUtil.getProperties(Object.values(response.ServiceData.modelObjects),["a2Childran" , "a2IsRoot", "object_desc"]);

                 if (policyId) {
                     propertyPolicySvc.unregister(policyId);
                 }
                     if (response.searchResults) {
                         for (var x = 0; x < response.searchResults.length; ++x) {
                             var uid = response.searchResults[x].uid;
                             var obj = response.ServiceData.modelObjects[uid];
                             if (obj) {
                                 //pms: a2MasterClass
                                    if(obj.props.a2IsRoot.uiValues != null){
                                        if(obj.props.a2IsRoot.uiValues[0] == 'True'){
                                            children.push(obj);
                                        }
                                    }
                             }
                         }
                     }
                 if (response.totalFound === 0) {
                     parentNode.isLeaf = true;
                     var endReached = true;
                     var treeLoadResult = awTableSvc.buildTreeLoadResult(treeLoadInput, children, false, true,
                         endReached, null);
                     deferred.resolve({
                         treeLoadResult: treeLoadResult
                     });
                 } else {
                    parentNode.isLeaf = false;
                     var treeLoadResult = _getTreeLoadResult(parentNode, children, isLoadAllEnabled, treeLoadInput);
                     deferred.resolve({
                         treeLoadResult: treeLoadResult
                     });
                 }
                 return response;
        //  }catch(e){
      
        //  }
     }
 }
 
 /**
  *
  * @param {parentNode} parentNode -
  * @param {children} children -
  * @param {isLoadAllEnabled} isLoadAllEnabled -
  * @param {actionObjects} actionObjects -
  * @param {treeLoadInput} treeLoadInput -
  * @return {awTableSvc.buildTreeLoadResult} awTableSvc.buildTreeLoadResult -
  *
  **/
 function _getTreeLoadResult(parentNode, children, isLoadAllEnabled, treeLoadInput) {
     _buildTreeTableStructure(_getTreeTableColumnInfos(), parentNode, children, isLoadAllEnabled);
     if (parentNode.children !== undefined && parentNode.children !== null) {
         var mockChildNodes = parentNode.children.concat(_mapNodeId2ChildArray[parentNode.id]);
     } else {
         var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
     }
     var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
     var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;
     var tempCursorObject = {
         endReached: endReached,
         startReached: true
     };
 
     var treeLoadResult = awTableSvc.buildTreeLoadResult(treeLoadInput, mockChildNodes, false, true,
         endReached, null);
     treeLoadResult.parentNode.cursorObject = tempCursorObject;
     return treeLoadResult;
 }
 
 /**
  * @param {ObjectArray} columnInfos -
  * @param {Boolean} isLoadAllEnabled -
  * @param {ViewModelTreeNode} vmNode -
  * @param {Number} childNdx -
  */
 function _populateColumns(isLoadAllEnabled, vmNode) {
     if (isLoadAllEnabled) {
         if (!vmNode.props) {
             vmNode.props = {};
         }
 
         var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject(cdm
             .getObject(vmNode.uid), 'EDIT');
 
         tcViewModelObjectService.mergeObjects(vmNode, vmo);
     }
 }
 
 var exports = {};
 
 export let createVmNodeUsingNewObjectInfo = function (modelObject, levelNdx, childNdx, isLoadAllEnabled) {
     var nodeId = modelObject.uid;
     var type = modelObject.type;
     var displayName = modelObject.props.object_name.uiValues[0];
 
     var iconURL = iconSvc.getTypeIconURL(type);
 
     var vmNode = awTableSvc.createViewModelTreeNode(nodeId, type, displayName, levelNdx, childNdx, iconURL);
     vmNode.modelType = modelObject.modelType;
     !containChildren(modelObject.props, vmNode);
 
     vmNode.selected = true;
 
     _populateColumns(isLoadAllEnabled, vmNode);
     return vmNode;
 };
 
 /**
  * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
  *            action function is invoked from.
  * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
  *
  * <pre>
  * {
  *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
  * }
  * </pre>
  */
 export let loadTreeTableColumns = function (uwDataProvider, data) {
     var deferred = AwPromiseService.instance.defer();
     appCtxService.ctx.treeVMO = uwDataProvider;
     var awColumnInfos = _getTreeTableColumnInfos(data);
 
     uwDataProvider.columnConfig = {
         columns: awColumnInfos
     };
 
     deferred.resolve({
         columnInfos: awColumnInfos
     });
 
     return deferred.promise;
 };
 
 /**
  * Get a page of row data for a 'tree' table.
  *
  * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
  *            the result of processing the 'inputData' property of a DeclAction based on data from the current
  *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
  *
  * <pre>
  * {
  * Extra 'debug' Properties
  *     delayTimeTree: {Number}
  * }
  * </pre>
  *
  * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
  *         available.
  */
 export let loadTreeTableData = function () { // eslint-disable-line no-unused-vars
     /**
      * Extract action parameters from the arguments to this function.
      */
      var treeLoadInput = arguments[0];

     /**
      * Extract action parameters from the arguments to this function.
      * <P>
      * Note: The order or existence of parameters can varey when more-than-one property is specified in the
      * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
      */
     var delayTimeTree = 0;
     for (var ndx = 0; ndx < arguments.length; ndx++) {
         var arg = arguments[ndx];
         if (uwPropertySvc.isViewModelProperty(arg) && arg.propertyName === 'delayTimeTree') {
             delayTimeTree = arg.dbValue;
         }
     }

     /**
      * Check the validity of the parameters
      */
     var deferred = AwPromiseService.instance.defer();
 
     var failureReason = awTableSvc.validateTreeLoadInput(treeLoadInput);
 
     if (failureReason) {
         deferred.reject(failureReason);
 
         return deferred.promise;
     }
 
     /**
      * Load the 'child' nodes for the 'parent' node.
      */
     if (delayTimeTree > 0) {
        _.delay(_loadTreeTableRows, delayTimeTree, deferred, treeLoadInput,arguments[1]);
     } else {
        _loadTreeTableRows(deferred, treeLoadInput,arguments[1]);  
     }
    return deferred.promise;
 };
 

export let setViewModel = async function (ctx, dp) {
    if (ctx.newSelection === true) {
        //alert();
        let newCreatedObj = ctx.createdObj;
        let dpLoadedObjs = dp.getViewModelCollection().loadedVMObjects;

        if (newCreatedObj.props.a2IsRoot.dbValues[0] === null) { //sub일경우
            let preSelectTreeNode = _.find(dpLoadedObjs, {
                uid: newCreatedObj.uid
            });

            if (preSelectTreeNode != undefined) {
                ctx.newSelection = false;
                dp.selectionModel.setSelection(preSelectTreeNode);
            } else { //하위 전개하며 loadedVMObjects업데이트함.
                var tmpparentNode = _.find(dpLoadedObjs, {
                    uid: appCtxService.ctx.selection.uid
                });
                if (tmpparentNode != undefined) {
                     await AwcObjectUtil.getProperty(appCtxService.ctx.selection, "a2Childran");
          
                    let selectedParentNode = appCtxService.ctx.selection;

                    //toggle방식으로 refresh
                    selectedParentNode.loadingStatus = false;
                    selectedParentNode.isExpanded = false;
                    await eventBus.publish('masterDataObjectSpecTree.plTable.toggleTreeNode', selectedParentNode);

                    selectedParentNode.loadingStatus = false;
                    selectedParentNode.isExpanded = true;
                    await eventBus.publish('masterDataObjectSpecTree.plTable.toggleTreeNode', selectedParentNode);
                }
            }
        } else {
            let preSelectTreeNode = _.find(dpLoadedObjs, {
                uid: newCreatedObj.uid
            });

            if (preSelectTreeNode != undefined) {
                ctx.newSelection = false;
                dp.selectionModel.setSelection(preSelectTreeNode);
            }
        }

    }
}


/**
 * Update the displayName of a node when it's edited...
 */
export let updateDisplayNames = function( modified, eventData ) {
    if (eventData.vmc) {
        _.forEach(eventData.modifiedObjects, function (mo) {
            if(mo.modelType.typeHierarchyArray.indexOf('A2FMEAClassificationStorage') === -1){
                var newDisplayName = mo.props.object_name.uiValues[0];
                if (modified.displayName !== newDisplayName) {
                    treeTableDataService.updateVMODisplayName(modified, "object_name");
                }
            }
        });
    }
    return false;
};

 /**
  * Get a page of row data for a 'tree' table.
  *
  * @param {PropertyLoadRequestArray} propertyLoadRequests - An array of PropertyLoadRequest objects this action
  *            function is invoked from. The object is usually the result of processing the 'inputData' property
  *            of a DeclAction based on data from the current DeclViewModel on the $scope) . The 'pageSize'
  *            properties on this object is used (if defined).
  */
 export let loadTreeTableProperties = function (treeLoadInput) { // eslint-disable-line no-unused-vars
     /**
      * Extract action parameters from the arguments to this function.
      * <P>
      * Note: The order or existence of parameters can varey when more-than-one property is specified in the
      * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
      */
     var deferred = AwPromiseService.instance.defer();
     /**
      * Load the 'child' nodes for the 'parent' node.
      */
     loadChildren(treeLoadInput,deferred);
     return deferred.promise;
 };

 let loadChildren = async function (treeLoadInput,deferred){    
    var parentNode = treeLoadInput.parentNode;
    let children = [];
    let isLoadAllEnabled = true;
    let modelObj = AwcObjectUtil.getObject(parentNode.id);

    // modelObj.props.a2Childran.dbValues.forEach((e)=>{
    //
    //     let child = cdm.getObject(e);
    //     children.push(child);
    // })

    for(let e of modelObj.props.a2Childran.dbValues){
        let child = await AwcObjectUtil.getObject(e);
        await AwcObjectUtil.getStringPropertyUiValue(child, "object_name");
        if (child) {
            children.push(child);
        }
    }

    var treeLoadResult = _getTreeLoadResult(parentNode, children, isLoadAllEnabled, treeLoadInput);
    deferred.resolve({ treeLoadResult: treeLoadResult });

 }

let selection;
 //Sub아닐때(Root일때) 생성
export let createAndAttachObject = async function (data , ctx) {
    let soaInputParams ={
        createInputs:
        [{
            createData:
            {
                boName: "A2FMEAClassification",   //was A2FMEAClsManager
                propertyNameValues:{
                    object_name : [data.FMEAClsName.dbValue],
                    object_desc: [data.FMEAClsDesc.dbValue],
                    a2IsRoot : [ "true" ],
                    a2CategoryCode: [data.FMEAClsCategory.dbValue]
                },
                compoundCreateInput: { }
            }
        }]
    }
    let response;
    selection = appCtxService.ctx.selected;
    try{
        response = await soaSvc.post('Core-2015-07-DataManagement','createRelateAndSubmitObjects2',soaInputParams);

        ctx.createdObj =  response.output[0].objects[0];
        ctx.newSelection = true;
        eventBus.publish('primaryWorkarea.reset');

    }catch(e){
        //AwcNotificationUtil.show("ERROR",locale.getLocalizedText(localeText,"A2FailedCreateChecklist"));
        AwcPanelUtil.closeCommandPanel();
    }finally{
        appCtxService.unRegisterCtx('createPanel');
        AwcPanelUtil.closeCommandPanel(); 
    }
}

 
// pms: let selection;
// Sub일때 생성
export let createAndAttachObjectSub = async function (data , ctx) {
    //let dereivedBOname; 
    // if(data.deriveType.dbValues[0] != undefined){
    //     dereivedBOname = data.deriveType.dbValues[0];
    // }else{
    //     dereivedBOname = "A2FMEAClsUser";
    // }

    selection = appCtxService.ctx.selected;
    var soaInputParams = {
        inputs: [ {
            clientId: 'CreateObject',
            createData: {
                boName: "A2FMEAClassification",   //was dereivedBOname
                propertyNameValues: {
                    object_name : [data.FMEAClsName.dbValue],
                    object_desc: [data.FMEAClsDesc.dbValue],
                    a2CategoryCode: [data.FMEAClsCategory.dbValue]
                }
            },
            dataToBeRelated: {},
            workflowData: {},
            targetObject: null,
            pasteProp: ''
        } ]
    };

    if( data.isRoot.dbValue != true){
        soaInputParams.inputs[0].createData.propertyNameValues.a2ParentId =  [ selection.props.a2Id.dbValues[0] ];
    }else{
        soaInputParams.inputs[0].createData.propertyNameValues.a2IsRoot = [ "true" ];
    }

    try{
        let response;
        response = await soaSvc.post('Core-2016-09-DataManagement','createAttachAndSubmitObjects', soaInputParams);
        
        ctx.newSelection = true;
        ctx.createdObj =  response.output[0].objects[0];
        ctx.selection = selection; //parent


            // pms: Relation일 경우
            // var inputData = {
            //     input : [{
            //         primaryObject: {
            //             type : ctx.selected.type,
            //             uid : ctx.selected.uid
            //         },
            //         secondaryObject: {
            //             type : response.output[0].objects[0].type,
            //             uid : response.output[0].objects[0].uid                        
            //         },
            //         relationType: "a2MasterChildrenRef",
            //         clientId: '',
            //         userData: {
            //             uid: 'AAAAAAAAAAAAAA',
            //             type: 'unknownType'
            //         }
            //     }]
            // };
            // soaSvc.post('Core-2006-03-DataManagement','createRelations', inputData).then( function( response ) {
            //     eventBus.publish('primaryWorkarea.reset');
            // });

    }catch(e){
        //AwcNotificationUtil.show("ERROR",locale.getLocalizedText(localeText,"A2FailedCreateChecklist"));
        AwcPanelUtil.closeCommandPanel();
    }finally{
        appCtxService.unRegisterCtx('createPanel');
        AwcPanelUtil.closeCommandPanel();

        exports.setViewModel( ctx, ctx.treeVMO );
        //pms:setViewModel(data);
    }
}

 export default exports = {
     createVmNodeUsingNewObjectInfo,
     loadTreeTableColumns,
     loadTreeTableData,
     loadTreeTableProperties,
     createAndAttachObject,
     createAndAttachObjectSub,
     setViewModel,
     updateDisplayNames
 };
 /**
  * @memberof NgServices
  */
 app.factory('A2FMEAClassificationTreeTableService', () => exports);
 