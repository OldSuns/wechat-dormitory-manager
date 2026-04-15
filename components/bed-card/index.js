Component({
  properties: {
    bed: { type: Object, value: {} },
    roomNumber: { type: String, value: '' },
    isLeavingSoon: { type: Boolean, value: false },
    userRole: { type: String, value: 'admin' },
  },
  methods: {
    onTap() {
      this.triggerEvent('bedtap', {
        bedNo: this.data.bed.bedNo,
        status: this.data.bed.status,
      });
    },
  },
});
