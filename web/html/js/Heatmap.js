"use strict";

function Heatmap(file_id) {
    this.buckets = [];
    this.bucket_count = 200;
    this.duration = 0;
    this.last_bucket_index = -1;
    this.file_id = +file_id;

    // Initialize
    this.reset();

    // Sync every 20 mins
    this.syncTimer = window.setInterval(this.sync, 20*60*1000);
}

Heatmap.prototype = {
    constructor: Heatmap
};

Heatmap.prototype.reset = function() {
    for (let i = 0; i < this.bucket_count; i++) {
        this.buckets[i] = 0;
    }
};

Heatmap.prototype.incrementBucket = function(bucket_index) {
    if (bucket_index < 0 || bucket_index > this.bucket_count-1) {
        logError('Bucket index ' + bucket_index + ' out of range');
        return;
    }

    this.buckets[bucket_index]++;
};

Heatmap.prototype.setDuration = function(duration) {
    this.duration = duration;

    // Determine number of buckets
    const total_secs = Math.ceil(duration);
    if (total_secs < 100) {
        this.bucket_count = total_secs * 2;
    }
};

Heatmap.prototype.sync = function() {
    const bucket_changes = [];

    for (let i = 0; i < this.bucket_count; i++) {
        const bucket_val = this.buckets[i];
        if (bucket_val > 0) {
            bucket_changes.push([i, bucket_val]);
        }
    }

    // No changes needed
    if (bucket_changes.length === 0) return;

    const self = this;

    $.post("ajax/heatmap.php", {changes: JSON.stringify(bucket_changes), file: this.file_id, bucket_count: this.bucket_count}, function(data) {
        self.reset();
    });
};

Heatmap.prototype.needsSync = function() {
    for (let i = 0; i < this.bucket_count; i++) {
        if (this.buckets[i] > 0) return true;
    }

    return false;
};

Heatmap.prototype.checkBounds = function(currentTime) {
    const bucketIndex = this.bucketForTime(currentTime);

    if (bucketIndex !== this.last_bucket_index) {
        this.incrementBucket(bucketIndex);
        this.last_bucket_index = bucketIndex;
    }
};

Heatmap.prototype.bucketForTime = function(time) {
    if (this.duration <= 0 || isNaN(time)) return 0;

    return Math.round((time / this.duration) * (this.bucket_count-1));
};