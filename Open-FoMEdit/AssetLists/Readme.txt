
	How to Build Asset Lists for No One Lives Forever 2

1)  Make sure you have Perl installed (\\dept\software\development\perl)

2)  In SS, do a get on Development\Tools\AssetLists

       NOTE:  The Perl scripts Development\Tools\AssetLists\processNewLogs.pl
              and Development\Tools\AssetLists\createAssetLists.pl have a hardcoded
              "ROOT" directory (i.e., c:/proj/TO2/development/tools/assetlists).  
              This should be changed (locally) in both files to reflect where 
              your AssetLists directory is located.

3)  Run NOLF 2.  Make sure you have the following console variables set before 
    launching the game:
    
       errorlog 1
       alwaysflushlog 1

4)  Before you start the level you wish to build an asset list for, type the 
    following in the console:

       showfileaccess 1

5)  Run the level you wish to build an asset list for.  Make sure you do not use
    cheats and that you use everything available in the level (i.e., you listen to
    all conversations, activate every secret, use all available weapons/ammo types,
    set off any explosions, generate all debris available in the level, etc.)

6)  Once you have finished the level, quit the game before the next level is started 
    (i.e., don't allow the next level to load, this will mess up your error.log).

      NOTE:  If you need to run the level multiple times to load all resources,
             after step 6 copy your error.log file to a temporary file and
             and do steps 3 thru 6 again.  Then merge the new error.log file
             with the temporary file you saved.

7)  Copy the error.log file to your TO2\Development\Tools\AssetLists\logs\new folder.

8)  Rename the error.log file to levelname.log (e.g., c01s01.log if you were running
    c01s01.dat)

9)  Run TO2\Development\Tools\AssetLists\BuildAssetLists.pl (you need to have Perl
    installed to run this script).  
	
      NOTE:  When you run this script, the log file in the AssetLists\logs\new 
             directory will be moved to the AssetLists\logs\processed directory 
             and renamed based on the time/date.  The log will then be processed 
             and an intermediate file will be copied to AssetLists\processing.  
             The final .txt version of the log fill will be copied to AssetLists\final.

10) Copy the AssetLists\Final\levelname.txt file into the Game\Worlds\ directory
    associated with the level that was logged.  For example, if you logged
    Game\Worlds\RetailSinglePlayer\c01s0.dat, you should copy the 
    AssetLists\Final\c01s01.txt file to Game\Worlds\RetailSinglPlayer\c01s01.txt.

11) Make sure you check c01s01.txt into SS

12) You're done.  The next time you run c01s01 all of the assets listed in c01s01.txt
    will be automatically cached when the level is loaded.


