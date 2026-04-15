Component({
  properties: {
    application: { type: Object, value: {} },
    showActions: { type: Boolean, value: false },
  },
  methods: {
    onApprove() {
      this.triggerEvent('approve', { applicationId: this.data.application.applicationId });
    },
    onReject() {
      this.triggerEvent('reject', { applicationId: this.data.application.applicationId });
    },
  },
});
