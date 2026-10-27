define('custom:controllers/apartment', ['controllers/record'], function (RecordController) {
    return RecordController.extend({
        actionList: function (params) {
            this.main('custom:views/apartment/board', {
                scope: this.name,
                params: params || {}
            }, null, {useStored: false, key: 'list'});
        }
    });
});
