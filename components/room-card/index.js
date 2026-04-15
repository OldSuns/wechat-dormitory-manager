Component({
  properties: {
    room: { type: Object, value: {} },
    summary: { type: Object, value: {} },
  },
  methods: {
    onTap() {
      this.triggerEvent('roomtap', { roomId: this.data.room.roomId });
    },
  },
});
