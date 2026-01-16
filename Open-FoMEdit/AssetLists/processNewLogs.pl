#! /usr/bin/perl
use File::Find;
use File::Path;
use File::Copy;
use Cwd;

$ROOT 			= "c:/proj/TO2/tools/assetlists";
$NEWLOGS 		= "$ROOT/logs/new";
$PROCESSEDLOGS 	= "$ROOT/logs/processed";
$ASSETLISTS		= "$ROOT/processing";

# set output to not line-buffered
$| = 1;

sub removeDups {
	# get the parameters
	my $list = shift( @_ );

	$i = 0; $j = 0;
	while ( $i <= ( $#$list - 1 ) ) {
		$j = $i + 1;
		while ( $j <= $#$list ) {
			if ( $$list[ $i ] eq $$list[ $j ] ) {
				splice( @$list, $j, 1 );
			} else {
				++$j;
			}
		}
		++$i;
	}
}

# Edit the following RegExps to finetune things to filterout
sub filterout {
	my $pat = shift;

	return 1 if $pat =~ m/^\s*$/;

	return 0;
}

sub outputWorldData {

	undef @oldAssets;
	undef @assets;

	# read in the previous file (if there)
	open INFILE, "<$ASSETLISTS/$worldName.out";

	while (<INFILE>) {
		chop;
		push @oldAssets, $_;
	}

	close INFILE;

	# open the file for output now
	open OUTFILE, ">$ASSETLISTS/$worldName.out" || 
		die "Can't open outout world file: $worldname\n";

	
	# accumulate assets
	@assets = (@newAssets, @oldAssets);
	removeDups (\@assets);
	
	foreach (@assets) {
		print OUTFILE "$_\n";
	}
	close OUTFILE;
}

#
# method for processing each lta file
#
$logNumber = 0;
($sec, $min, $hour, $mday, $mon, $year, @foo) = localtime(time);
$dateString = "$year$mon$mday$min$sec";

sub process_file {

	# save so that we can copy it later
	$fileName = $_;

	# return if this is not an log file
	return if ! /\.log$/;

	# pull out the worldname
	/^(.*)\.log/;
	$worldName = lc($1);

	# clear all old data
	undef @newAssets;

	# open up this log
	open LOG, "< $File::Find::name" || 
		die "Can't open log file: $File::Find::name\n";

	# go through log and generate the per level data
	while (<LOG>) {
		chop;

		# skip "music files"
		next if /.*\s+music\\.*/i;

		# skip "world textures"
		next if /.*\s+tex\\.*/i;

		# skip "render styles"
		next if /.*\s+rs\\.*/i;

		# change all \ to /
		tr!\\!/!;
		s/\/\//\//g;

		# skip other comments
		next if /^- ---/;

		# skip "unfreed string lines"
		next if /^- Unfreed string:/;

		# regexp out filter
		next if filterout ($_);

		split;
		push (@newAssets, lc($_[4]));
	}

	# if there is a world, write it out
	if (defined $worldName) {
		outputWorldData();
	}
	close LOG;

	# move the log to the processed directory
	copy ("$fileName", "$PROCESSEDLOGS/${dateString}_${logNumber}.log");
	unlink $fileName;
	$logNumber++;
}


###
### MAIN
###

# find and process all .log files
find (\&process_file, $NEWLOGS);
