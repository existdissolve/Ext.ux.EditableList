Ext.ux.EditableList = Ext.extend(Ext.List, {
    inEditMode: false,
    inSwipeMode: false,
    initComponent: function() {
        var me = this;
        var tmpTpl,tplParams;
        // define the template for our delete-able list items
        tmpTpl = '<div class="x-list-delete">' +
                    '<div class="x-list-delete-icon multi-delete"></div>' +
                    '<div class="x-list-delete-content">{listtpl}</div>' +
                    '<div class=" x-component" style="-webkit-box-flex: 1;"></div>' +
                    '<div class="x-button x-button-decline-small  x-list-delete-button x-hidden">' +
                        '<span class="x-button-label">Delete</span></span>' +
                    '</div>' +
                 '</div>'
        tplParams = {
            listtpl: (Ext.isString(this.itemTpl) ? this.itemTpl : this.itemTpl.html)
        };
        // create new xtemplate
        this.deleteTpl = new Ext.XTemplate(tmpTpl);
        // apply any existing templates to our new one
        this.itemTpl = this.deleteTpl.apply(tplParams);
        // set up listeners for our editable list
        this.listeners = {
            // activate: when component is created
            "activate": this.addEditButton,
            // beginEdit: when editing action begins
            "beginEdit": function(list,mode) {
                this.selModel.setLocked(true);
                if(mode=="multi") {
                    this.inEditMode = true;
                    this.addDeleteBar();
                }
                else {
                    this.inSwipeMode = true;
                }
            },
            // endEdit; when editing action stops
            "endEdit": function(list,mode) {
                if(mode=="multi") {
                    this.inEditMode = false;
                }
                else {
                    this.inSwipeMode = false;
                }
                this.selModel.setLocked(false);
            },
            // el: adding delegate listener to the delete button "item" in our XTemplate
            // will fire on clicks of the element
            el: {
                tap: function(e,item,delegate){
                    if(me.inSwipeMode) {
                        var listitem = Ext.get(item).up(".x-list-delete");
                        listitem.addCls("selected");
                        me.deleteItems();
                    }
                    else {
                        e.stopEvent();
                    }
                },
                delegate: '.x-display'
            },
            // itemtap: when an item in our list is tapped; handles regular and in-edit-mode taps
            itemtap: function(view,index,item,e){
                // if we're in view mode, handle delete list fn
                if(view.inEditMode) {
                    var item = Ext.get(item);
                    item.select(".x-list-delete").each(function(){
                        if(this.hasCls("selected")) {
                            this.addCls("unselected");
                            this.removeCls("selected");
                            view.setDeleteButton();
                        }
                        else {
                            this.addCls("selected");
                            this.removeCls("unselected");
                            view.setDeleteButton();
                        }
                    })
                }
                // otherwise, let regular process take over
                else {
                    if(e.target.className!="x-list-disclosure") {
                        this.getSelectionModel().select(this.getRecord(item))
                    }
                }
            },
            // swipe: when user swipes over a list itme
            itemswipe: function(view,index,item,e) {
                if(view.inEditMode) {
                    return false;
                }
                var swipedIndex = "";
                view.fireEvent("beginEdit",view,"swipe");
                // loop over all list items, removing display class from delete button
                view.el.select(".x-list-delete-button").each(function(el,c,idx){
                   // if this delete button is displayed, save index
                   if(el.hasCls("x-display")) {
                       swipedIndex =  idx;
                   }
                   el.removeCls("x-display");
                   el.addCls("x-hidden");
                });
                // if the index of the existing delete button equals the row just swiped
                // fire the endEdit event, since swiping is done
                if(swipedIndex===index) {
                    view.fireEvent("endEdit",view,"swipe");
                }
                // otherwise, add the display class to the new row's delete button
                else {
                    var el = Ext.get(item);
                    el.select(".x-list-delete-button").each(function(){
                        this.removeCls("x-hidden");
                        this.addCls("x-display");
                    })
                }
            }
        }
        Ext.ux.EditableList.superclass.initComponent.call(this);
        // add new events
        this.addEvents("beginEdit","endEdit");
    },
    /* addEditButton: adds an editing button to the parent panel's toolbar
     * is fired when this component is originally created
     */
    addEditButton: function() {
        var me = this;
        var panel = this.up("panel");
        var ttbar = panel.dockedItems.getAt(0);
        var btn = new Ext.Button({
            ui: "action",
            text: "Edit",
            //bubbleEvents: ["endEdit"],
            handler: function() {
                if(this.getText() == "Edit") {
                    this.setText("Done");
                    me.showDeleteIcons();
                }
                else {
                    this.setText("Edit");
                    me.hideDeleteIcons();
                }
            },
            listeners: {
                "beginEdit": function(list,mode) {
                    this.setText("Done");  
                },
                "endEdit": function(list,mode) {
                    this.setText("Edit");
                }
            }
        });
        // relay events to the button so we can cherry pick on them from the button as well
        btn.relayEvents(this,['beginEdit','endEdit']);
        ttbar.add(btn);
        ttbar.doComponentLayout();
        panel.doComponentLayout();
    },
    /* addDeleteBar: adds a toolbar to the bottom of the parent panel
     * is fired when the mode is set to "multi" (e.g., when not in swipe editing mode)
     */
    addDeleteBar: function() {
        var me = this;
        var panel = this.up("panel");
        var bbar = panel.dockedItems.getAt(1);
        if (!bbar) {
            bbar = new Ext.Toolbar({
                dock: "bottom",
                ui: "light",
                hidden: true,
                showAnimation: "fade",
                listeners: {
                    "endEdit": function(list, mode){
                        this.hide(this.showAnimation)
                    },
                    "hide": function(){
                        this.doHide();
                        panel.doComponentLayout();                    
                    }
                },
                items: [{
                    xtype: "button",
                    iconCls: "trash",
                    iconMask: true,
                    ui: "decline",
                    text: "Delete",
                    disabled: true,
                    handler: me.deleteItems,
                    scope: me
                }]
            });
            // relay event to bottom toolbar so we can cherry pick it from the toolbar as well
            bbar.relayEvents(this, ["endEdit"])
            panel.addDocked(bbar);
        }
        this.setDeleteButton();
        bbar.show();
        panel.doComponentLayout();
    },
    /* showDeleteIcons: adds/removes classes from list item's delete icons, allowing CSS3 to handle animations
     */
    showDeleteIcons: function() {
        var nodes = this.getNodes();
        this.el.select(".x-list-delete").each(function(){
            this.removeCls("hidden");
            this.removeCls("selected");
            this.addCls("unselected");           
        });
        this.fireEvent("beginEdit",this,"multi");
    },
    /* hideDeleteIcons: adds/removes classes from list item's delete icons, allowing CSS3 to handle animations
     */
    hideDeleteIcons: function() {
        var nodes = this.getNodes();
        this.el.select(".x-list-delete").each(function(){
            this.addCls("hidden");      
        });
        this.el.select(".x-list-delete-button").each(function(){
            this.removeCls("x-display");
            this.addCls("x-hidden");
        })
        var mode = this.inEditMode ? "multi" : "swipe";
        this.fireEvent("endEdit",this,mode)
    },
    /* onTapStart: override of regular onTapStart() method to prevent highlighting of list items during edit mode
     * is fired every time a list item is taped
     */
    onTapStart: function(e,t) {
        var me = this,
            item = this.findTargetByEvent(e);

        if (item && !this.inEditMode && !this.inSwipeMode) {
            if (me.pressedDelay) {
                if (me.pressedTimeout) {
                    clearTimeout(me.pressedTimeout);
                }
                me.pressedTimeout = setTimeout(function() {
                    Ext.fly(item).addCls(me.pressedCls);
                }, Ext.isNumber(me.pressedDelay) ? me.pressedDelay : 100);
            }
            else {
                Ext.fly(item).addCls(me.pressedCls);
            }
        }
    },
    /* setDeleteButton: enables multi-delete button and increments button "count" text
     */
    setDeleteButton: function() {
        var count = this.el.select(".selected").elements.length;
        var btn = this.up("panel").dockedItems.getAt(1).items.getAt(0);
        if(count) {
            btn.enable()
            btn.setText(Ext.util.Format.format('Delete ({0})', count));
            btn.doComponentLayout()
        }
        else {
            btn.setText("Delete");
            btn.disable();
        }
    },
    /* deleteItems: deletes selected items from list's store
     */
    deleteItems: function() {
        var me = this;
        var records = [];
        var groups = me.store.getGroups();
        var tmprecords = [];
        if(groups.length) {
            for(var i=0;i<groups.length;i++) {
                var cr = groups[i].children;
                for(var x=0;x<cr.length;x++) {
                    tmprecords.push(cr[x]);
                }
            }
            var cache = new Ext.util.MixedCollection();
            cache.addAll(tmprecords);
        }
        var count = this.el.select(".x-list-delete").each(function(el,c,idx){
            if (this.hasCls("selected")) {
                if(cache) {
                    var record = cache.getAt(idx);
                }
                else {
                    var record = me.store.getAt(idx);
                }
                records.push(record);
            }
        });
        this.store.remove(records)
        this.store.sync();
        this.hideDeleteIcons();
    }
});
Ext.reg('editablelist', Ext.ux.EditableList);