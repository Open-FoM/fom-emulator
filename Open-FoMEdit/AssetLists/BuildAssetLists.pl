#! /usr/bin/perl

# process all new logs
print "Processing logs...\n";
`perl processNewLogs.pl`;

# generate the asset lists...
print "Generating asset lists...\n";
`perl createAssetLists.pl`;

