EdiPanel = function(base, basename) {
	this.base = base;
	this.row = 0;
	this.column = 0;
	this.width = (this.base.ediopts.xtype == "slack") ? this.base.ediopts.minwidth : this.base.ediopts.width;
	this.height = (this.base.ediopts.ytype == "slack") ? this.base.ediopts.minheight : this.base.ediopts.height;
	this.colspan = 1;
	this.rowspan = 1;
	this.basename = basename;
	if ((typeof(this.base.ediopts.mpi) != "undefined") && this.base.ediopts.mpi) {
		this.mpi = true;
		this.mpikey = this.base.ediopts.mpikey;
	}
	else {
		this.mpi = false;
		this.mpikey = "";
	}
};
EdiPanel.prototype.openPanelLink = function(link) {};