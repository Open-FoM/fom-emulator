#! /usr/bin/perl
use File::Find;
use File::Path;
use File::Copy;
use Cwd;

$ROOT 			= "c:/proj/TO2/tools/assetlists";
$ASSETLISTS		= "$ROOT/processing";
$COMPLETE		= "$ROOT/final";

# set output to not line-buffered
$| = 1;

# Edit the following RegExps to finetune things to filterout
sub filterout {
	my $pat = shift;

	# list of rejections
	return 1 if $pat =~ m%^stream/%i;

	return 0;
}

#
# method for processing each lta file
#
sub process_file {

	# return if this is not an log file
	return if ! /\.out$/;

	# save so that we can copy it later
	$fileName = $_;

	# pull out the worldname
	/^(.*)\.out/;
	$worldName = lc($1);

	# clear asset list
	undef @sounds;
	undef @models;
	undef @textures;
	undef @sprites;

	# open up this data file
	open (INFILE, "< $File::Find::name") || 
		die "Can't open log file: $File::Find::name\n";

	# go through log and generate the per level data
	while (<INFILE>) {
		chop;

		# if this is in the filter-out list, then don't add
		next if filterout ($_);

		# model
		if (/\.ltb/) {
			push @models, $_;

		# sprite
		} elsif (/\.spr/) {
			push @sprites, $_;

		# texture
		} elsif (/\.dtx/) {
			push @textures, $_;

		# sound
		} elsif (/\.wav/) {
			push @sounds, $_;
		}
	}
	close INFILE;

	# open the file for output now
	open (OUTFILE, ">$COMPLETE/$worldName.txt") || 
		die "Can't open output asset list: $worldname\n";

	print OUTFILE "/*\n * IMPORTANT: DO NOT EDIT\n";
	print OUTFILE " * these files are automatically generated\n */\n";


	# output sounds
	print OUTFILE "\n[Sounds]\n";
	$i=0;
	foreach (@sounds) {
		printf( OUTFILE "Sound%03d\t= \"%s\"\n", $i, $_ );
		++$i;
	}

	# output models
	$i=0;
	print OUTFILE "\n[Models]\n";
	foreach (@models) {
		printf( OUTFILE "Model%03d\t= \"%s\"\n", $i, $_ );
		++$i;
	}

	# output textures
	$i=0;
	print OUTFILE "\n[Textures]\n";
	foreach (@textures) {
		printf( OUTFILE "Texture%03d\t= \"%s\"\n", $i, $_ );
		++$i;
	}

	# output sprites
	$i=0;
	print OUTFILE "\n[Sprites]\n";
	foreach (@sprites) {
		printf( OUTFILE "Sprite%03d\t= \"%s\"\n", $i, $_ );
		++$i;
	}

	close OUTFILE;
}


###
### MAIN
###

# find and process all assetlists files
find (\&process_file, $ASSETLISTS);
